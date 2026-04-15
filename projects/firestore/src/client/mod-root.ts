export {
  Firestore,
  type FirestoreOptions,
} from "@client/entrypoints/client/mod.ts";
export { QueryRef, type Op } from "@client/domain/coordinators/query/mod.ts";
export { WriteBatch } from "@client/domain/coordinators/batch/mod.ts";
export { AtomicTxn } from "@client/domain/coordinators/atomic/mod.ts";
export {
  sample,
  type SampleOptions,
  type SampleResult,
} from "@client/domain/coordinators/sample/mod.ts";
export { CollectionRef, DocRef } from "@core/business/ref/mod.ts";
export { FirestoreError } from "@core/dto/errors.ts";
export type { ServiceAccount } from "@core/data/auth/mod.ts";
export {
  arrayRemove,
  arrayUnion,
  deleteField,
  increment,
  maximum,
  minimum,
  type Sentinel,
  serverTimestamp,
} from "@core/business/sentinels/mod.ts";
