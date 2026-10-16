# Spec Delta

## Purpose

Provides backend code with chat completions from large language models through OpenRouter, configured per environment, so later features can use AI without new integration work.

## ADDED Requirements

### Requirement: Chat completion through OpenRouter
The backend SHALL be able to send a chat prompt to OpenRouter's OpenAI-compatible chat completions API and deliver the model's answer to the calling backend code as a non-blocking stream of text chunks, which the caller can also collect into the full answer.

#### Scenario: Successful completion
- **WHEN** backend code sends a prompt and OpenRouter streams an answer
- **THEN** the caller receives the chunks in order and their concatenation equals the full answer

#### Scenario: No blocking
- **WHEN** a completion is requested from an I/O thread
- **THEN** the request completes without blocking that thread

### Requirement: Environment-driven model and credentials
The OpenRouter base URL, API key, model id, and request timeout SHALL come from configuration and be changeable per environment without rebuilding.

#### Scenario: Change the model
- **WHEN** the configured model id is changed and the application restarts
- **THEN** subsequent requests to OpenRouter use the new model id

#### Scenario: Credentials sent
- **WHEN** a completion request is sent
- **THEN** it carries `Authorization: Bearer <configured API key>`

### Requirement: API key confidentiality
The OpenRouter API key SHALL NOT appear in logs, in responses to clients, in the frontend, or in the container image.

#### Scenario: Request logging enabled
- **WHEN** request/response logging for the AI client is enabled
- **THEN** the logged output does not contain the API key

### Requirement: Failure isolation
Upstream errors, missing credentials, or timeouts from OpenRouter SHALL surface as a stream failure to the calling code within the configured timeout and SHALL NOT stop the application or affect unrelated requests.

#### Scenario: Upstream error
- **WHEN** OpenRouter returns a 5xx or does not answer within the timeout
- **THEN** the caller's stream fails with an error and the application stays ready

#### Scenario: No API key configured
- **WHEN** the application starts without an OpenRouter API key
- **THEN** the application starts and becomes ready, and completion calls fail with an error
