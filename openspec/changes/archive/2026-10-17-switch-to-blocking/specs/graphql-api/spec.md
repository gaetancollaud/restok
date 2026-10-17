# Spec Delta

## REMOVED Requirements

### Requirement: Non-blocking request handling
**Reason**: The backend now uses plain blocking code (Hibernate ORM over JDBC, blocking AI calls); GraphQL operations run on worker threads instead of I/O threads.
**Migration**: None for clients: the GraphQL schema and responses are unchanged.
