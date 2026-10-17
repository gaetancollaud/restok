# Spec Delta

## REMOVED Requirements

### Requirement: Chat completion through OpenRouter
**Reason**: Completions are no longer delivered as a non-blocking stream.
**Migration**: Use "Blocking chat completion through OpenRouter": call the AI service from a worker thread and use the returned answer.

## ADDED Requirements

### Requirement: Blocking chat completion through OpenRouter
The backend SHALL be able to send a chat prompt to OpenRouter's OpenAI-compatible chat completions API and return the model's full answer to the calling backend code as one string, in a single blocking call.

#### Scenario: Successful completion
- **WHEN** backend code sends a prompt and OpenRouter answers
- **THEN** the call returns the full answer text

## MODIFIED Requirements

### Requirement: Failure isolation
Upstream errors, missing credentials, or timeouts from OpenRouter SHALL surface as an error from the completion call within the configured timeout and SHALL NOT stop the application or affect unrelated requests.

#### Scenario: Upstream error
- **WHEN** OpenRouter returns a 5xx or does not answer within the timeout
- **THEN** the completion call fails with an error and the application stays ready

#### Scenario: No API key configured
- **WHEN** the application starts without an OpenRouter API key
- **THEN** the application starts and becomes ready, and completion calls fail with an error
