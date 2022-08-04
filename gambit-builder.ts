import { Tables } from "./Tables";

interface WhereArgs {
  value: string | string[] | boolean;
  columnName: string;
  type?: "AND" | "OR";
  comparison?: "gt" | "lt" | "eq" | "neq";
  tableName?: string;
}

interface JoinArgs {
  primaryTableName: Tables;
  secondaryTableName: Tables;
  joinColumn: string;
  secondaryJoinColumn?: string;
  typeOfJoin?: "INNER" | "LEFT OUTER" | "RIGHT OUTER" | "FULL OUTER";
}

interface SelectArgs {
  columns: string[] | string;
  tableName: Tables;
  alias?: string;
  agg?: "SUM" | "COUNT";
}

interface GroupByArgs {
  tableName: Tables;
  columnName: string;
}

interface OrderByArgs extends GroupByArgs {
  orderDirection?: "ASC" | "DESC";
}

interface QueryBody {
  tableName: string;
  selectArgs: { columnName: { [tableName: string]: string } }[];
  limitArgs?: number;
  whereArgs?: {
    conditions: {
      columnName: { [tableName: string]: string };
      value: string | boolean;
      comparison: "gt" | "lt" | "eq" | "neq";
    }[];
    type: "AND" | "OR";
  }[];
  joinArgs?: {
    master: {
      [tableName: string]: string;
    };
    slave: {
      [tableName: string]: string;
    };
    typeOfJoin: "INNER" | "LEFT OUTER" | "RIGHT OUTER" | "FULL OUTER";
  }[];
  orderByArgs?: {
    columnName: {
      [tableName: string]: string;
    };
    orderDirection?: "ASC" | "DESC";
  }[];
  groupByArgs?: {
    [tableName: string]: string;
  }[];
}

class GambitBuilder {
  public constructor(conf) {
    this.conf = conf;
  }

  private conf: any;

  private getTableName(table: Tables): string {
    return this.conf.get(`gambitTable.${table}`);
  }

  private query: QueryBody = {
    selectArgs: [],
    limitArgs: 100,
    tableName: "",
  };

  public tableName(tableName: Tables): this {
    this.query.tableName = this.getTableName(tableName);
    return this;
  }

  public selectArgs({ columns, tableName, alias, agg }: SelectArgs): this {
    if (!columns) return this;
    const optionalFields = {
      ...(alias && { Alias: alias }),
      ...(agg && { Agg: agg }),
    };
    if (Array.isArray(columns)) {
      this.query.selectArgs.push(
        ...columns.map((col: string) => ({
          columnName: { [this.getTableName(tableName)]: col },
          ...optionalFields,
        }))
      );
    } else {
      this.query.selectArgs.push({
        columnName: { [this.getTableName(tableName)]: columns },
        ...optionalFields,
      });
    }
    return this;
  }

  public whereArgs({
    type,
    value,
    comparison,
    columnName,
    tableName,
  }: WhereArgs): this {
    if (!value) return this;
    if (!this.query.whereArgs) {
      this.query.whereArgs = [];
    }
    if (Array.isArray(value)) {
      this.query.whereArgs.push({
        conditions: value.map((v: string) => ({
          columnName: {
            [this.getTableName(tableName as Tables) || this.query.tableName]:
              columnName,
          },
          value: v,
          comparison: comparison || "eq",
        })),
        type: type || "AND",
      });
    } else {
      this.query.whereArgs.push({
        conditions: [
          {
            columnName: {
              [this.getTableName(tableName as Tables) || this.query.tableName]:
                columnName,
            },
            value,
            comparison: comparison || "eq",
          },
        ],
        type: type || "AND",
      });
    }
    return this;
  }

  public limitArgs(limit: number): this {
    this.query.limitArgs = limit;
    return this;
  }

  public joinArgs({
    primaryTableName,
    secondaryTableName,
    typeOfJoin,
    joinColumn,
    secondaryJoinColumn,
  }: JoinArgs): this {
    if (!primaryTableName || !secondaryTableName || !joinColumn) return this;
    if (!this.query.joinArgs) {
      this.query.joinArgs = [];
    }
    this.query.joinArgs.push({
      master: {
        tableName: this.getTableName(primaryTableName as Tables),
        joinColumn,
      },
      slave: {
        tableName: this.getTableName(secondaryTableName as Tables),
        joinColumn: secondaryJoinColumn || joinColumn,
      },
      typeOfJoin: typeOfJoin || "INNER",
    });

    return this;
  }

  public orderByArgs({
    columnName,
    tableName,
    orderDirection,
  }: OrderByArgs): this {
    if (!columnName || !tableName) return this;
    if (!this.query.orderByArgs) {
      this.query.orderByArgs = [];
    }
    this.query.orderByArgs.push({
      columnName: { [this.getTableName(tableName)]: columnName },
      ...(orderDirection && { orderDirection }),
    });

    return this;
  }

  public groupByArgs({ columnName, tableName }: GroupByArgs): this {
    if (!columnName || !tableName) return this;
    if (!this.query.groupByArgs) {
      this.query.groupByArgs = [];
    }
    this.query.groupByArgs.push({
      [this.getTableName(tableName)]: columnName,
    });

    return this;
  }

  public queryBody(): GambitBuilder["query"] {
    if (!this.query.tableName) throw new Error("Table name is required");
    if (this.query.selectArgs.length === 0) {
      this.query.selectArgs = [
        {
          columnName: { [this.query.tableName]: "*" },
        },
      ];
    }
    return this.query;
  }
}

export default GambitBuilder;
