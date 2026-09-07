# Apache Kafka

## What is Kafka?

Apache Kafka is a distributed event streaming platform used to transfer, store, and process data streams in real time.

It allows applications to communicate asynchronously by sending messages through topics instead of communicating directly with each other.

Kafka was originally developed by LinkedIn and later became an Apache Software Foundation project.

---

## Why Do We Need Kafka?

Imagine an online store:

1. A customer places an order.
2. The Order Service creates the order.
3. The Email Service sends a confirmation email.
4. The Inventory Service updates stock.
5. The Payment Service processes payment.

Without Kafka, the Order Service may need to call all other services directly.

Problems:
- Tight coupling between services
- Slower response times
- Service failures can affect other services
- Difficult to scale

Kafka solves this by acting as a message broker between services.

---

## Kafka Architecture

```text
Producer ---> Topic ---> Consumer
```

### Producer

A producer sends messages to Kafka.

Example:
- Order Service sends a message:
  ```json
  {
    "orderId": 123,
    "customer": "John"
  }
  ```

### Topic

A topic is a category where messages are stored.

Examples:
- orders
- payments
- notifications

### Consumer

A consumer reads messages from a topic.

Examples:
- Email Service
- Inventory Service
- Analytics Service

---

## Example Flow

```text
Customer
    |
    v
Order Service
    |
    v
Kafka Topic (orders)
    |
    +-----> Email Service
    |
    +-----> Inventory Service
    |
    +-----> Analytics Service
```

When a customer places an order:

1. Order Service publishes an event to the `orders` topic.
2. Kafka stores the event.
3. Multiple consumers read the same event independently.

---

## Partitions

Topics can be divided into partitions.

```text
orders topic

Partition 0
Partition 1
Partition 2
```

Benefits:
- Parallel processing
- Better performance
- Horizontal scalability

Messages inside a single partition remain ordered.

---

## Consumer Groups

Multiple consumers can work together as a consumer group.

```text
orders topic

Consumer Group
 ├── Consumer 1
 ├── Consumer 2
 └── Consumer 3
```

Kafka distributes partitions among consumers.

Benefits:
- Load balancing
- High throughput
- Fault tolerance

---

## Message Retention

Kafka stores messages for a configurable period.

Examples:
- 1 day
- 7 days
- 30 days

Consumers can read old messages even if they were offline.

---

## Key Kafka Features

- High performance
- Scalability
- Fault tolerance
- Durable message storage
- Real-time processing
- Event-driven architecture

---

## Kafka Components Summary

| Component | Purpose |
|------------|---------|
| Producer | Sends messages |
| Topic | Stores messages |
| Partition | Splits data for scalability |
| Consumer | Reads messages |
| Consumer Group | Distributes work among consumers |
| Broker | Kafka server |
| Cluster | Multiple Kafka brokers |

---

## Real-World Use Cases

### E-Commerce

- Order processing
- Inventory updates
- Payment events

### Banking

- Transaction processing
- Fraud detection

### Ride Sharing

- Driver location updates
- Trip events

### Analytics

- User activity tracking
- Log processing

---

## Kafka vs Traditional API Calls

| API Calls | Kafka |
|------------|--------|
| Synchronous | Asynchronous |
| Tight coupling | Loose coupling |
| Harder to scale | Easy to scale |
| Service failures can propagate | Services work independently |

---

## Conclusion

Apache Kafka is a distributed event streaming platform that allows producers to publish messages to topics and consumers to process those messages independently. It is widely used in microservices, real-time analytics, event-driven systems, and large-scale distributed applications.