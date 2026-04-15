import { encodeWrite, type EncodedWrite } from "@core/business/encode/mod.ts";
import { DocRef, type RefContext } from "@core/business/ref/mod.ts";
import { request } from "@core/data/http/mod.ts";

const MAX_WRITES = 500;

class BatchDocWriter {
  constructor(private readonly doc: DocRef, private readonly push: (w: EncodedWrite) => void) {}
  set(data: Record<string, unknown>): void {
    this.push(encodeWrite(this.doc.fullName, data));
  }
}

export class WriteBatch {
  private writes: EncodedWrite[] = [];
  constructor(private readonly ctx: RefContext) {}

  target(...path: string[]): BatchDocWriter {
    if (path.length % 2 !== 0) {
      throw new TypeError("batch.target() requires an even-segment doc path");
    }
    const doc = new DocRef(this.ctx, path);
    return new BatchDocWriter(doc, (w) => {
      if (this.writes.length >= MAX_WRITES) {
        throw new Error(`WriteBatch cannot exceed ${MAX_WRITES} writes`);
      }
      this.writes.push(w);
    });
  }

  async commit(): Promise<void> {
    if (this.writes.length === 0) return;
    await request(
      this.ctx.http,
      "POST",
      `${this.ctx.databasePrefix}:commit`,
      { writes: this.writes },
    );
    this.writes = [];
  }
}
