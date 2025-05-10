import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { generateToken } from '../lib/utils.js';
import { login, signup, logout, checkAuth } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

jest.mock('../models/user.model.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Authentication', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(cookieParser());
        
        // Mock routes
        app.post('/api/auth/signup', signup);
        app.post('/api/auth/login', login);
        app.post('/api/auth/logout', logout);
        app.get('/api/auth/check', protectRoute, checkAuth);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Signup', () => {
        it('should create a new user successfully', async () => {
            const mockUser = {
                fullName: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            };

            const hashedPassword = 'hashedPassword123';
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue(hashedPassword);

            User.findByEmail.mockResolvedValue(null);
            User.create.mockResolvedValue({
                id: 'user123',
                full_name: mockUser.fullName,
                email: mockUser.email
            });

            const response = await request(app)
                .post('/api/auth/signup')
                .send(mockUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id', 'user123');
            expect(response.body).toHaveProperty('fullName', mockUser.fullName);
            expect(response.body).toHaveProperty('email', mockUser.email);
        });

        it('should return error for existing email', async () => {
            const mockUser = {
                fullName: 'Test User',
                email: 'existing@example.com',
                password: 'password123'
            };

            User.findByEmail.mockResolvedValue({ id: 'existingUser' });

            const response = await request(app)
                .post('/api/auth/signup')
                .send(mockUser);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message', 'User already exists');
        });
    });

    describe('Login', () => {
        it('should login successfully with correct credentials', async () => {
            const mockUser = {
                email: 'test@example.com',
                password: 'password123'
            };

            const dbUser = {
                id: 'user123',
                full_name: 'Test User',
                email: mockUser.email,
                password: 'hashedPassword'
            };

            User.findByEmail.mockResolvedValue(dbUser);
            bcrypt.compare.mockResolvedValue(true);

            const response = await request(app)
                .post('/api/auth/login')
                .send(mockUser);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', dbUser.id);
            expect(response.body).toHaveProperty('email', dbUser.email);
        });

        it('should return error for invalid credentials', async () => {
            const mockUser = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            User.findByEmail.mockResolvedValue({
                id: 'user123',
                password: 'hashedPassword'
            });
            bcrypt.compare.mockResolvedValue(false);

            const response = await request(app)
                .post('/api/auth/login')
                .send(mockUser);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message', 'Invalid credentials');
        });
    });

    describe('Protected Routes', () => {
        it('should allow access with valid token', async () => {
            const mockUser = {
                id: 'user123',
                full_name: 'Test User',
                email: 'test@example.com'
            };

            const token = 'valid.jwt.token';
            jwt.verify.mockReturnValue({ userId: mockUser.id });
            User.findById.mockResolvedValue(mockUser);

            const response = await request(app)
                .get('/api/auth/check')
                .set('Cookie', [`jwt=${token}`]);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id', mockUser.id);
            expect(response.body).toHaveProperty('email', mockUser.email);
        });

        it('should deny access without token', async () => {
            const response = await request(app)
                .get('/api/auth/check');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message', 'Not authorized, no token');
        });
    });

    describe('Logout', () => {
        it('should clear jwt cookie on logout', async () => {
            const response = await request(app)
                .post('/api/auth/logout');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Logged out successfully');
            // Check if cookie is cleared
            const cookies = response.headers['set-cookie'];
            expect(cookies[0]).toMatch(/jwt=;/);
        });
    });
}); 