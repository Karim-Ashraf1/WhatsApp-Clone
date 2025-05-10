package broker

import (
    "encoding/json"
    "log"

    amqp "github.com/rabbitmq/amqp091-go"
)

// Broker represents a RabbitMQ connection, channel, queue, and optional exchange.
type Broker struct {
    conn      *amqp.Connection
    channel   *amqp.Channel
    queue     amqp.Queue
    exchange  string
    url       string // Store URL for reconnection
}

// NewBroker creates a new Broker instance connected to RabbitMQ.
func NewBroker(rabbitMQURL, queueName, exchange string) (*Broker, error) {
    conn, err := amqp.Dial(rabbitMQURL)
    if err != nil {
        log.Printf("Failed to connect to RabbitMQ: %v", err)
        return nil, err
    }

    ch, err := conn.Channel()
    if err != nil {
        log.Printf("Failed to open channel: %v", err)
        conn.Close()
        return nil, err
    }

    if exchange != "" {
        err = ch.ExchangeDeclare(
            exchange, // name
            "direct", // type
            true,     // durable
            false,    // auto-deleted
            false,    // internal
            false,    // no-wait
            nil,      // arguments
        )
        if err != nil {
            log.Printf("Failed to declare exchange: %v", err)
            ch.Close()
            conn.Close()
            return nil, err
        }
    }

    q, err := ch.QueueDeclare(
        queueName, // name
        true,      // durable
        false,     // delete when unused
        false,     // exclusive
        false,     // no-wait
        nil,       // arguments
    )
    if err != nil {
        log.Printf("Failed to declare queue: %v", err)
        ch.Close()
        conn.Close()
        return nil, err
    }

    if exchange != "" {
        err = ch.QueueBind(
            queueName, // queue name
            queueName, // routing key
            exchange,  // exchange
            false,     // no-wait
            nil,       // arguments
        )
        if err != nil {
            log.Printf("Failed to bind queue: %v", err)
            ch.Close()
            conn.Close()
            return nil, err
        }
    }

    return &Broker{
        conn:     conn,
        channel:  ch,
        queue:    q,
        exchange: exchange,
        url:      rabbitMQURL,
    }, nil
}

// ensureConnection checks and re-establishes the connection if needed.
func (b *Broker) ensureConnection() error {
    if b.conn == nil || b.conn.IsClosed() {
        conn, err := amqp.Dial(b.url)
        if err != nil {
            log.Printf("Failed to reconnect to RabbitMQ: %v", err)
            return err
        }
        b.conn = conn

        b.channel, err = conn.Channel()
        if err != nil {
            log.Printf("Failed to open channel on reconnect: %v", err)
            conn.Close()
            return err
        }

        // Re-declare queue
        q, err := b.channel.QueueDeclare(
            b.queue.Name, // name
            true,         // durable
            false,        // delete when unused
            false,        // exclusive
            false,        // no-wait
            nil,          // arguments
        )
        if err != nil {
            log.Printf("Failed to re-declare queue: %v", err)
            b.channel.Close()
            b.conn.Close()
            return err
        }
        b.queue = q

        // Re-declare exchange and binding if needed
        if b.exchange != "" {
            err = b.channel.ExchangeDeclare(
                b.exchange, // name
                "direct",   // type
                true,       // durable
                false,      // auto-deleted
                false,      // internal
                false,      // no-wait
                nil,        // arguments
            )
            if err != nil {
                log.Printf("Failed to re-declare exchange: %v", err)
                b.channel.Close()
                b.conn.Close()
                return err
            }

            err = b.channel.QueueBind(
                b.queue.Name, // queue name
                b.queue.Name, // routing key
                b.exchange,   // exchange
                false,        // no-wait
                nil,          // arguments
            )
            if err != nil {
                log.Printf("Failed to re-bind queue: %v", err)
                b.channel.Close()
                b.conn.Close()
                return err
            }
        }
    }
    return nil
}

// Publish sends a message to the queue.
func (b *Broker) Publish(message interface{}) error {
    if err := b.ensureConnection(); err != nil {
        return err
    }

    body, err := json.Marshal(message)
    if err != nil {
        log.Printf("Failed to marshal message: %v", err)
        return err
    }

    err = b.channel.Publish(
        b.exchange,   // exchange
        b.queue.Name, // routing key
        false,        // mandatory
        false,        // immediate
        amqp.Publishing{
            ContentType: "application/json",
            Body:        body,
        },
    )
    if err != nil {
        log.Printf("Failed to publish message: %v", err)
        return err
    }

    log.Println("Published message:", string(body))
    return nil
}

// Consume receives messages from the queue.
func (b *Broker) Consume() (<-chan amqp.Delivery, error) {
    if err := b.ensureConnection(); err != nil {
        return nil, err
    }

    msgs, err := b.channel.Consume(
        b.queue.Name, // queue
        "",           // consumer
        true,         // auto-ack
        false,        // exclusive
        false,        // no-local
        false,        // no-wait
        nil,          // args
    )
    if err != nil {
        log.Printf("Failed to start consuming: %v", err)
        return nil, err
    }

    return msgs, nil
}

// Close closes the channel and connection.
func (b *Broker) Close() error {
    if b.channel != nil {
        if err := b.channel.Close(); err != nil {
            log.Printf("Failed to close channel: %v", err)
            return err
        }
    }
    if b.conn != nil {
        if err := b.conn.Close(); err != nil {
            log.Printf("Failed to close connection: %v", err)
            return err
        }
    }
    return nil
} 