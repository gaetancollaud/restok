import type { CodegenConfig } from '@graphql-codegen/cli';

// Types and injectable GQL services from the backend-generated schema snapshot (see SchemaSnapshotTest).
const config: CodegenConfig = {
  schema: 'schema.graphql',
  documents: 'src/**/*.graphql',
  generates: {
    'src/app/graphql/generated.ts': {
      plugins: ['typescript-operations', 'typescript-apollo-angular'],
      config: { addExplicitOverride: true, scalars: { DateTime: 'string', Date: 'string' } },
    },
  },
};

export default config;
