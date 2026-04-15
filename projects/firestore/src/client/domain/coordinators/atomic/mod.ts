import { encodeWrite, type EncodedWrite } from "@core/business/encode/mod.ts";
import { decodeFields } from "@core/business/decode/mod.ts";
import { DocRef, type RefContext } from "@core/business/ref/mod.ts";
import { request } from "@core/data/http/mod.ts";
import { FirestoreError } from "@core/dto/errors.ts";

const MAX_WRITES = 500;

class AtomicDocHandle {
  constructor(
    private readonly txn: AtomicTxn,
    private readonly doc: DocRef,
  ) {}
  get(): Promise<Record<string, unknown> | null> {
    return this.txn._read(this.doc);
  }
  set(data: Record<string, unknown>): void {
    this.txn._buffer(encodeWrite(this.doc.fullName, data));
  }
}

export class AtomicTxn {
  private transaction?: string;
  private writes: EncodedWrite[] = [];
  private hasWritten = false;

  constructor(private readonly ctx: RefContext) {}

  target(...path: string[]): AtomicDocHandle {
    if (path.length % 2 !== 0) {
      throw new TypeError("atomic.target() requires even-segment doc path");
    }
    return new AtomicDocHandle(this, new DocRef(this.ctx, path));
  }

  async begin(): Promise<void> {
    if (this.transaction) return;
    const res = await request<{ transaction: string }>(
      this.ctx.http,
      "POST",
      `${this.ctx.databasePrefix}:beginTransaction`,
      {},
    );
    this.transaction = res.transaction;
  }

  async _read(doc: DocRef): Promise<Record<string, unknown> | null> {
    if (this.hasWritten) {
      throw new Error("Reads must precede writes in a transaction");
    }
    await this.begin();
    const qs = `transaction=${encodeURIComponent(this.transaction!)}`;
    try {
      const res = await request<{ fields?: Record<string, never> }>(
        this.ctx.http,
        "GET",
        `${doc.fullName}?${qs}`,
      );
      return decodeFields(res.fields ?? {}, this.ctx.firestore);
    } catch (e) {
      if (e instanceof FirestoreError && e.code === 404) return null;
      throw e;
    }
  }

  _buffer(w: EncodedWrite): void {
    if (this.writes.length >= MAX_WRITES) {
      throw new Error(`AtomicTxn cannot exceed ${MAX_WRITES} writes`);
    }
    this.writes.push(w);
    this.hasWritten = true;
  }

  async commit(): Promise<void> {
    if (!this.transaction && this.writes.length === 0) return;
    await this.begin();
    await request(
      this.ctx.http,
      "POST",
      `${this.ctx.databasePrefix}:commit`,
      { writes: this.writes, transaction: this.transaction },
    );
    this.writes = [];
    this.transaction = undefined;
  }

  async rollback(): Promise<void> {
    if (!this.transaction) return;
    await request(
      this.ctx.http,
      "POST",
      `${this.ctx.databasePrefix}:rollback`,
      { transaction: this.transaction },
    );
    this.transaction = undefined;
  }
}
