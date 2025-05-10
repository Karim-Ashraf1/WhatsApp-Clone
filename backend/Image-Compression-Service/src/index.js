const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const imageCompressionRouter = require('./routes/compression.route');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Simple health check and API documentation
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Image Compression Service',
    endpoints: {
      '/compress': 'Standard compression (medium quality - 80%)',
      '/compress/low': 'Low compression (high quality - 95%)',
      '/compress/medium': 'Medium compression (quality 80%)',
      '/compress/high': 'High compression (low quality - 50%)'
    }
  });
});

app.use('/', imageCompressionRouter);

const PORT = process.env.PORT || 8084;

app.listen(PORT, () => {
  console.log(`Image Compression Service running on port ${PORT}`);
  console.log(`Available compression endpoints:`);
  console.log(`- POST /compress     -> Standard compression (medium quality - 80%)`);
  console.log(`- POST /compress/low -> Low compression (high quality - 95%)`);
  console.log(`- POST /compress/medium -> Medium compression (quality 80%)`);
  console.log(`- POST /compress/high -> High compression (low quality - 50%)`);
});
