import { encodeValue } from "@core/business/encode/mod.ts";
import { decodeFields } from "@core/business/decode/mod.ts";
import { request } from "@core/data/http/mod.ts";
import { CollectionRef } from "@core/business/ref/mod.ts";

export type Op =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "in"
  | "not-in"
  | "array-contains"
  | "array-contains-any";

const OP_MAP: Record<Op, string> = {
  "==": "EQUAL",
  "!=": "NOT_EQUAL",
  "<": "LESS_THAN",
  "<=": "LESS_THAN_OR_EQUAL",
  ">": "GREATER_THAN",
  ">=": "GREATER_THAN_OR_EQUAL",
  "in": "IN",
  "not-in": "NOT_IN",
  "array-contains": "ARRAY_CONTAINS",
  "array-contains-any": "ARRAY_CONTAINS_ANY",
};

type Filter = { field: string; op: Op; value: unknown };
type Order = { field: string; dir: "asc" | "desc" };

export class QueryRef {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitN?: number;

  constructor(private readonly coll: CollectionRef) {}

  where(field: string, op: Op, value: unknown): QueryRef {
    this.filters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): QueryRef {
    this.orders.push({ field, dir });
    return this;
  }

  limit(n: number): QueryRef {
    this.limitN = n;
    return this;
  }

  set(): never {
    throw new TypeError("set() is not allowed on QueryRef");
  }

  async get(): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    const structured = this.build();
    const res = await request<Array<{ document?: { name: string; fields?: Record<string, never> } }>>(
      this.coll.ctx.http,
      "POST",
      `${this.coll.parentFullName}:runQuery`,
      { structuredQuery: structured },
    );
    const out: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const row of res) {
      if (!row.document) continue;
      const logical = row.document.name.slice(
        this.coll.ctx.databasePrefix.length + 1,
      );
      const segs = logical.split("/");
      out.push({
        id: segs[segs.length - 1],
        data: decodeFields(row.document.fields ?? {}, this.coll.ctx.firestore),
      });
    }
    return out;
  }

  private build(): Record<string, unknown> {
    const q: Record<string, unknown> = {
      from: [{ collectionId: this.coll.collectionId }],
    };
    if (this.filters.length === 1) {
      const f = this.filters[0];
      q.where = { fieldFilter: this.fieldFilter(f) };
    } else if (this.filters.length > 1) {
      q.where = {
        compositeFilter: {
          op: "AND",
          filters: this.filters.map((f) => ({
            fieldFilter: this.fieldFilter(f),
          })),
        },
      };
    }
    if (this.orders.length > 0) {
      q.orderBy = this.orders.map((o) => ({
        field: { fieldPath: o.field },
        direction: o.dir === "asc" ? "ASCENDING" : "DESCENDING",
      }));
    }
    if (this.limitN !== undefined) q.limit = this.limitN;
    return q;
  }

  private fieldFilter(f: Filter): Record<string, unknown> {
    return {
      field: { fieldPath: f.field },
      op: OP_MAP[f.op],
      value: encodeValue(f.value),
    };
  }
}
