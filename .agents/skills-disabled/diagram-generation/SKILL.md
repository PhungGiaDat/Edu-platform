---
name: diagram-generation
description: Generate diagrams, flowcharts, sequence diagrams for Eraser.io (Mermaid/D2 syntax)
---
# Diagram Generation

Generate professional diagrams, flowcharts, and visualizations compatible with Eraser.io and other tools.

## Supported Formats

| Format | Best For | Tools |
|--------|----------|-------|
| **Mermaid** | Flowcharts, sequences, Gantt | Eraser.io, GitHub, Notion |
| **D2** | Architecture, infrastructure | Eraser.io, D2 playground |
| **PlantUML** | UML diagrams | PlantUML server |
| **ASCII** | Quick docs, markdown | Any text editor |

## Mermaid Diagrams

### Flowchart
```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[Process]
    D --> E
    E --> F[End]
```

```mermaid
flowchart LR
    Client -->|Request| LoadBalancer
    LoadBalancer --> API1[API Server 1]
    LoadBalancer --> API2[API Server 2]
    API1 --> DB[(Database)]
    API2 --> DB
```

### Sequence Diagram
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database

    U->>F: Click Login
    F->>A: POST /auth/login
    A->>D: Query user
    D-->>A: User data
    A->>A: Validate password
    A-->>F: JWT Token
    F-->>U: Redirect to Dashboard
```

### Class Diagram
```mermaid
classDiagram
    class User {
        +String id
        +String email
        +String password
        +login()
        +logout()
    }
    class Order {
        +String id
        +Date createdAt
        +Float total
        +addItem()
    }
    class Product {
        +String id
        +String name
        +Float price
    }
    User "1" --> "*" Order : places
    Order "*" --> "*" Product : contains
```

### Entity Relationship
```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        string id PK
        string email UK
        string password
        datetime created_at
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        string id PK
        string user_id FK
        float total
        string status
    }
    ORDER_ITEM }|--|| PRODUCT : references
    ORDER_ITEM {
        string id PK
        string order_id FK
        string product_id FK
        int quantity
        float price
    }
    PRODUCT {
        string id PK
        string name
        float price
        int stock
    }
```

### State Diagram
```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing : Submit
    Processing --> Approved : Validate
    Processing --> Rejected : Fail
    Approved --> Completed : Execute
    Rejected --> Pending : Retry
    Completed --> [*]
```

### Gantt Chart
```mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Planning
    Requirements    :a1, 2025-01-01, 7d
    Design          :a2, after a1, 5d
    section Development
    Backend         :a3, after a2, 14d
    Frontend        :a4, after a2, 14d
    section Testing
    QA              :a5, after a3, 7d
    Deploy          :a6, after a5, 3d
```

## D2 Diagrams

### System Architecture
```d2
direction: right

User: {
  shape: person
}

LoadBalancer: {
  shape: hexagon
}

API: {
  shape: rectangle
  style.fill: "#E3F2FD"
}

Database: {
  shape: cylinder
  style.fill: "#FFF3E0"
}

Cache: {
  shape: queue
  style.fill: "#E8F5E9"
}

User -> LoadBalancer: HTTPS
LoadBalancer -> API: Route
API -> Database: Query
API -> Cache: Get/Set
```

### Microservices Architecture
```d2
Client: {
  shape: person
}

Gateway: API Gateway {
  style.fill: "#E1BEE7"
}

Services: {
  Auth: {
    shape: rectangle
    style.fill: "#BBDEFB"
  }
  Users: {
    shape: rectangle
    style.fill: "#BBDEFB"
  }
  Orders: {
    shape: rectangle
    style.fill: "#BBDEFB"
  }
}

Queue: Message Queue {
  shape: queue
}

Client -> Gateway: REST/GraphQL
Gateway -> Services.Auth: Authenticate
Gateway -> Services.Users: User ops
Gateway -> Services.Orders: Order ops
Services.Orders -> Queue: Events
```

### Cloud Infrastructure
```d2
Cloud: AWS {
  VPC: {
    style.fill: "#F5F5F5"
    
    Public: Public Subnet {
      ALB: Application Load Balancer
      Bastion: Bastion Host
    }
    
    Private: Private Subnet {
      EC2_1: EC2 Instance 1
      EC2_2: EC2 Instance 2
    }
    
    Data: Data Layer {
      RDS: PostgreSQL RDS
      ElastiCache: Redis Cluster
    }
  }
}

Users: {
  shape: person
}

Users -> Cloud.VPC.Public.ALB: HTTPS
Cloud.VPC.Public.ALB -> Cloud.VPC.Private.EC2_1
Cloud.VPC.Public.ALB -> Cloud.VPC.Private.EC2_2
Cloud.VPC.Private.EC2_1 -> Cloud.VPC.Data.RDS
Cloud.VPC.Private.EC2_1 -> Cloud.VPC.Data.ElastiCache
```

## PlantUML Diagrams

### Component Diagram
```plantuml
@startuml
package "Frontend" {
  [React App]
  [Redux Store]
}

package "Backend" {
  [API Gateway]
  [Auth Service]
  [User Service]
  [Order Service]
}

database "PostgreSQL" {
  [Users DB]
  [Orders DB]
}

[React App] --> [Redux Store]
[React App] --> [API Gateway] : REST
[API Gateway] --> [Auth Service]
[API Gateway] --> [User Service]
[API Gateway] --> [Order Service]
[User Service] --> [Users DB]
[Order Service] --> [Orders DB]
@enduml
```

### Deployment Diagram
```plantuml
@startuml
node "Client" {
  [Browser]
}

node "Web Server" {
  [Nginx]
  [Node.js App]
}

node "Database Server" {
  [PostgreSQL]
}

node "Cache Server" {
  [Redis]
}

[Browser] --> [Nginx] : HTTPS
[Nginx] --> [Node.js App]
[Node.js App] --> [PostgreSQL]
[Node.js App] --> [Redis]
@enduml
```

## ASCII Diagrams

### Simple Flow
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Input  │────▶│ Process │────▶│  Output │
└─────────┘     └─────────┘     └─────────┘
```

### Architecture
```
┌─────────────────────────────────────────────────┐
│                    Client                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Browser  │  │  Mobile  │  │   CLI    │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
└───────┼─────────────┼─────────────┼─────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              ┌───────────────┐
              │  Load Balancer│
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Server 1 │  │ Server 2 │  │ Server 3 │
  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │             │             │
       └─────────────┼─────────────┘
                     ▼
             ┌───────────────┐
             │   Database    │
             └───────────────┘
```

### Decision Tree
```
                    ┌──────────────┐
                    │   Start      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Condition?  │
                    └──────┬───────┘
                    ┌──────┴──────┐
                    │             │
               ┌────▼────┐   ┌────▼────┐
               │  Yes    │   │   No    │
               └────┬────┘   └────┬────┘
                    │             │
               ┌────▼────┐   ┌────▼────┐
               │Action A │   │Action B │
               └────┬────┘   └────┬────┘
                    │             │
                    └──────┬──────┘
                           │
                    ┌──────▼───────┐
                    │    End       │
                    └──────────────┘
```

## Diagram Selection Guide

| Use Case | Best Format | Example |
|----------|-------------|---------|
| User flow | Mermaid flowchart | Login/signup flow |
| API interactions | Mermaid sequence | Request/response |
| Database schema | Mermaid ERD | Data model |
| System architecture | D2 | Microservices |
| Infrastructure | D2 | Cloud resources |
| Code structure | PlantUML class | OOP design |
| Timeline | Mermaid Gantt | Project plan |
| Quick docs | ASCII | README |

## Eraser.io Integration

### Using in Eraser.io
1. Copy Mermaid or D2 code
2. Paste into Eraser.io editor
3. Customize colors and styling
4. Export as PNG/SVG or embed

### Best Practices for Eraser.io
- Use D2 for complex architecture
- Use Mermaid for simple diagrams
- Apply consistent color schemes
- Add labels and descriptions
- Group related components

## Color Schemes

### Mermaid
```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#2563EB',
  'primaryTextColor': '#FFFFFF',
  'primaryBorderColor': '#1E40AF',
  'lineColor': '#64748B',
  'secondaryColor': '#F1F5F9',
  'tertiaryColor': '#E2E8F0'
}}}%%
```

### D2
```d2
style: {
  fill: "#E3F2FD"
  stroke: "#1976D2"
  font-color: "#1A237E"
}
```

## Best Practices

### Do's
- Keep diagrams simple and focused
- Use consistent shapes and colors
- Add clear labels
- Show relationships with arrows
- Include legends for complex diagrams

### Don'ts
- Overcrowd with too many elements
- Use inconsistent styling
- Skip connection labels
- Ignore direction/flow
- Forget to update when system changes
