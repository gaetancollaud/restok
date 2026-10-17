# database-migrations Specification

## Purpose

Ensures the PostgreSQL schema is created and evolved only through versioned, ordered migrations applied automatically, so every environment has the same schema for the same release.

## Requirements

### Requirement: Migrations applied at startup
The application SHALL apply all pending versioned migrations to PostgreSQL at startup, before reporting ready. If a migration fails, the application SHALL NOT become ready.

#### Scenario: Empty database
- **WHEN** the application starts against an empty database
- **THEN** all migrations are applied in version order and the application becomes ready

#### Scenario: Failing migration
- **WHEN** a pending migration fails to apply
- **THEN** the application fails to start and the error is logged

### Requirement: Migrations are the only schema source
Schema changes SHALL be made only through versioned migration files. The application SHALL NOT generate or alter the schema from its persistence model, and SHALL refuse to start if the model does not match the schema.

#### Scenario: Model and schema mismatch
- **WHEN** a persistent field is added in code without a matching migration
- **THEN** the application fails to start with a schema validation error

### Requirement: Released migrations are immutable
A migration that has been applied SHALL NOT be modified. The application SHALL refuse to start when an applied migration's checksum differs from the file.

#### Scenario: Edited migration
- **WHEN** an already-applied migration file is edited and the application restarts
- **THEN** the application fails to start with a checksum mismatch error

### Requirement: Safe with multiple replicas
When several instances start at the same time against the same database, each pending migration SHALL be applied exactly once.

#### Scenario: Two replicas start together
- **WHEN** two instances start simultaneously against a database with pending migrations
- **THEN** each migration is recorded once and both instances become ready
