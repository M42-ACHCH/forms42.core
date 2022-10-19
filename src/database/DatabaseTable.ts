/*
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 3 only, as
 * published by the Free Software Foundation.

 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 */

import { SQLRest } from "./SQLRest.js";
import { DataType } from "./DataType.js";
import { BindValue } from "./BindValue.js";
import { SQLSource } from "./SQLSource.js";
import { Alert } from "../application/Alert.js";
import { SQLRestBuilder } from "./SQLRestBuilder.js";
import { Connection } from "../public/Connection.js";
import { Filter } from "../model/interfaces/Filter.js";
import { SubQuery } from "../model/filters/SubQuery.js";
import { Record, RecordState } from "../model/Record.js";
import { DatabaseResponse } from "./DatabaseResponse.js";
import { FilterStructure } from "../model/FilterStructure.js";
import { DataSource } from "../model/interfaces/DataSource.js";
import { Connection as DatabaseConnection } from "../database/Connection.js";

export class DatabaseTable extends SQLSource implements DataSource
{
	public name:string;
	public arrayfecth:number = 32;
	public rowlocking: boolean = true;
	public queryallowed:boolean = true;
	public insertallowed:boolean = true;
	public updateallowed:boolean = true;
	public deleteallowed:boolean = true;

	private dirty$:Record[] = [];
	private eof$:boolean = false;

	private described$:boolean = false;

	private table$:string = null;
	private order$:string = null;
	private cursor$:string = null;

	private columns$:string[] = [];
	private primary$:string[] = [];
	private dmlcols$:string[] = [];

	private fetched$:Record[] = [];

	private nosql$:FilterStructure;
	private limit$:FilterStructure = null;
	private conn$:DatabaseConnection = null;

	private insreturncolumns$:string[] = null;
	private updreturncolumns$:string[] = null;
	private delreturncolumns$:string[] = null;

	private datatypes$:Map<string,DataType> =
		new Map<string,DataType>();

	public constructor(connection:Connection, table?:string, columns?:string|string[])
	{
		super();
		this.table$ = table;

		if (!(connection instanceof DatabaseConnection))
			connection = DatabaseConnection.getConnection(connection.name);

		if (connection == null)
		{
			Alert.fatal("Connection for database table '"+connection.name+"' is not a DatabaseConnection","Database Procedure");
			return;
		}

		this.conn$ = connection as DatabaseConnection;

		if (columns != null)
		{
			if (!Array.isArray(columns))
				columns = [columns];

			this.columns$ = columns;
		}

		this.name = table;
	}

	public set table(table:string)
	{
		this.table$ = table;
		this.described$ = false;
		if (this.name == null) this.name = table;
	}

	public clone() : DatabaseTable
	{
		let clone:DatabaseTable = new DatabaseTable(this.conn$,this.table$);

		clone.sorting = this.sorting;
		clone.primary$ = this.primary$;
		clone.columns$ = this.columns$;
		clone.described$ = this.described$;
		clone.arrayfecth = this.arrayfecth;
		clone.datatypes$ = this.datatypes$;

		return(clone);
	}

	public get sorting() : string
	{
		return(this.order$);
	}

	public set sorting(order:string)
	{
		this.order$ = order;
	}

	public get columns() : string[]
	{
		return(this.columns$);
	}

	public set columns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.columns$ = columns;
	}

	public get primaryKey() : string[]
	{
		if (this.primary$ == null || this.primary$.length == 0)
		{
			this.primary$ = [];
			this.primary$.push(...this.columns$);
		}

		return(this.primary$);
	}

	public set primaryKey(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.addColumns(columns);
		this.primary$ = columns;
	}

	public setDataType(column:string,type:DataType) : DatabaseTable
	{
		this.datatypes$.set(column?.toLowerCase(),type);
		return(this);
	}

	public get insertReturnColumns() : string[]
	{
		return(this.insreturncolumns$);
	}

	public set insertReturnColumns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.insreturncolumns$ = columns;
	}

	public get updateReturnColumns() : string[]
	{
		return(this.updreturncolumns$);
	}

	public set updateReturnColumns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.updreturncolumns$ = columns;
	}

	public get deleteReturnColumns() : string[]
	{
		return(this.delreturncolumns$);
	}

	public set deleteReturnColumns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.delreturncolumns$ = columns;
	}

	public addDMLColumns(columns:string|string[]) : void
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.dmlcols$ = this.mergeColumns(this.dmlcols$,columns);
	}

	public addColumns(columns:string|string[]) : void
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.columns$ = this.mergeColumns(this.columns$,columns);
	}

	public addFilter(filter:Filter | FilterStructure) : void
	{
		if (this.limit$ == null)
		{
			if (filter instanceof FilterStructure)
			{
				this.limit$ = filter;
				return;
			}

			this.limit$ = new FilterStructure();
		}

		this.limit$.and(filter);
	}

	public async lock(record:Record) : Promise<boolean>
	{
		if (!this.rowlocking)
			return(true);

		let sql:SQLRest = null;

		if (!await this.describe())
			return(false);

		sql = SQLRestBuilder.lock(this.table$,this.primary$,this.columns,record);
		this.setTypes(sql.bindvalues);

		let response:any = await this.conn$.lock(sql);
		let fetched:Record[] = this.parse(response);

		if (!response.success)
		{
			Alert.warning("Record is locked by another user. Try again later","Lock Record");
			return(false);
		}

		if (fetched.length == 0)
		{
			Alert.warning("Record has been deleted by another user. Requery to see changes","Lock Record");
			return(false);
		}

		for (let i = 0; i < this.columns.length; i++)
		{
			let lv:any = fetched[0].getValue(this.columns[i]);
			let cv:any = record.getInitialValue(this.columns[i]);

			if (lv != cv)
			{
				Alert.warning("Record has been changed by another user. Requery to see changes","Lock Record");
				return(false);
			}
		}

		return(true);
	}

	public async flush() : Promise<Record[]>
	{
		let sql:SQLRest = null;
		let response:any = null;
		let processed:Record[] = [];

		if (this.dirty$.length == 0)
			return([]);

		if (!this.conn$.connected())
		{
			Alert.warning("Not connected","Database Connection");
			return([]);
		}

		if (!await this.describe())
			return(null);

		for (let i = 0; i < this.dirty$.length; i++)
		{
			let rec:Record = this.dirty$[i];

			if (rec.failed)
				continue;

			if (rec.state == RecordState.Inserted)
			{
				processed.push(rec);

				let columns:string[] = this.mergeColumns(this.columns,this.dmlcols$);
				sql = SQLRestBuilder.insert(this.table$,columns,rec,this.insreturncolumns$);

				this.setTypes(sql.bindvalues);
				response = await this.conn$.insert(sql);

				this.castResponse(response);
				rec.response = new DatabaseResponse(response,this.insreturncolumns$);
			}

			if (rec.state == RecordState.Updated)
			{
				processed.push(rec);

				let columns:string[] = this.mergeColumns(this.columns,this.dmlcols$);
				sql = SQLRestBuilder.update(this.table$,this.primaryKey,columns,rec,this.updreturncolumns$);

				this.setTypes(sql.bindvalues);
				response = await this.conn$.update(sql);

				this.castResponse(response);
				rec.response = new DatabaseResponse(response,this.updreturncolumns$);
			}

			if (rec.state == RecordState.Deleted)
			{
				processed.push(rec);
				sql = SQLRestBuilder.delete(this.table$,this.primaryKey,rec,this.delreturncolumns$);

				this.setTypes(sql.bindvalues);
				response = await this.conn$.delete(sql);

				this.castResponse(response);
				rec.response = new DatabaseResponse(response,this.delreturncolumns$);
			}
		}

		this.dirty$ = [];
		return(processed);
	}

	public async refresh(record:Record) : Promise<void>
	{
		if (!await this.describe())
			return;

		record.refresh();

		let sql:SQLRest = SQLRestBuilder.refresh(this.table$,this.primary$,this.columns,record);
		this.setTypes(sql.bindvalues);

		let response:any = await this.conn$.refresh(sql);
		let fetched:Record[] = this.parse(response);

		if (fetched.length == 0)
		{
			Alert.warning("Record has been deleted by another user. Requery to see changes","Lock Record");
			return(null);
		}

		for (let i = 0; i < this.columns.length; i++)
		{
			let nv:any = fetched[0].getValue(this.columns[i]);
			record.setValue(this.columns[i],nv)
		}
	}

	public async insert(record:Record) : Promise<boolean>
	{
		if (!this.dirty$.includes(record))
			this.dirty$.push(record);
		return(true);
	}

	public async update(record:Record) : Promise<boolean>
	{
		if (!this.dirty$.includes(record))
			this.dirty$.push(record);
		return(true);
	}

	public async delete(record:Record) : Promise<boolean>
	{
		if (!this.dirty$.includes(record))
			this.dirty$.push(record);
		return(true);
	}

	public async getSubQuery(filter:FilterStructure, mstcols:string|string[], detcols:string|string[]) : Promise<SQLRest>
	{
		filter = filter?.clone();

		if (!Array.isArray(mstcols))
			mstcols = [mstcols];

		if (!Array.isArray(detcols))
			detcols = [detcols];

		if (!this.conn$.connected())
		{
			Alert.warning("Not connected","Database Connection");
			return(null);
		}

		if (!await this.describe())
			return(null);

		if (this.limit$ != null)
		{
			if (!filter) filter = this.limit$;
			else filter.and(this.limit$,"limit");
		}

		let details:FilterStructure = filter?.getFilterStructure("details");

		if (details != null)
		{
			let filters:Filter[] = details.getFilters();

			for (let i = 0; i < filters.length; i++)
			{
				let df:Filter = filters[i];

				if (df instanceof SubQuery && df.subquery == null)
					return(null);
			}
		}

		filter.delete("masters");

		filter?.getFilters().forEach((f) =>
		{f.setBindValueName(this.name+"_"+f.getBindValueName())})

		this.setTypes(filter?.get("qbe")?.getBindValues());
		this.setTypes(filter?.get("limit")?.getBindValues());

		let sql:SQLRest = SQLRestBuilder.subquery(this.table$,mstcols,detcols,filter);
		return(sql);
	}

	public async query(filter?:FilterStructure) : Promise<boolean>
	{
		this.eof$ = false;
		this.fetched$ = [];
		this.nosql$ = null;
		filter = filter?.clone();

		if (!this.conn$.connected())
		{
			Alert.warning("Not connected","Database Connection");
			return(false);
		}

		if (!await this.describe())
			return(false);

		if (this.limit$ != null)
		{
			if (!filter) filter = this.limit$;
			else filter.and(this.limit$,"limit");
		}

		this.setTypes(filter?.get("qbe")?.getBindValues());
		this.setTypes(filter?.get("limit")?.getBindValues());
		this.setTypes(filter?.get("masters")?.getBindValues());

		let details:FilterStructure = filter?.getFilterStructure("details");

		if (details != null)
		{
			let filters:Filter[] = details.getFilters();

			for (let i = 0; i < filters.length; i++)
			{
				let df:Filter = filters[i];

				if (df instanceof SubQuery && df.subquery == null)
				{
					if (this.nosql$ == null)
						this.nosql$ = new FilterStructure(this.name+".nosql");

					details.delete(df);
					this.nosql$.and(df);
					this.addColumns(df.columns);
				}
			}
		}

		this.createCursor();

		let sql:SQLRest = SQLRestBuilder.select(this.table$,this.columns,filter,this.sorting);
		let response:any = await this.conn$.select(sql,this.cursor$,this.arrayfecth);

		this.fetched$ = this.parse(response);
		this.fetched$ = await this.filter(this.fetched$);

		return(true);
	}

	public async fetch() : Promise<Record[]>
	{
		if (this.fetched$.length > 0)
		{
			let fetched:Record[] = [];
			fetched.push(...this.fetched$);

			this.fetched$ = [];
			return(fetched);
		}

		if (this.eof$)
			return([]);

		let response:any = await this.conn$.fetch(this.cursor$);

		if (!response.success)
		{
			console.error(this.name+" failed to fetch: "+JSON.stringify(response));
			return([]);
		}

		let fetched:Record[] = this.parse(response);

		fetched = await this.filter(fetched);

		if (fetched.length == 0)
			return(this.fetch());

		return(fetched);
	}

	public async closeCursor() : Promise<boolean>
	{
		let response:any = null;

		if (this.cursor$ != null && !this.eof$)
			response = await this.conn$.close(this.cursor$);

		this.eof$ = true;
		this.fetched$ = [];

		return(response.success);
	}

	private createCursor() : void
	{
		this.closeCursor();
		this.cursor$ = "select"+(new Date().getTime());
	}

	private async filter(records:Record[]) : Promise<Record[]>
	{
		if (this.nosql$)
		{
			let passed:Record[] = [];

			for (let i = 0; i < records.length; i++)
			{
				if (await this.nosql$.evaluate(records[i]))
					passed.push(records[i]);
			}

			records = passed;
		}

		return(records);
	}

	private async describe() : Promise<boolean>
	{
		let sql:SQLRest = new SQLRest();
		if (this.described$) return(true);

		sql.stmt += "select * from "+this.table$;
		sql.stmt += " where 1 = 2";

		let cursor:string = "desc."+(new Date().getTime());
		let response:any = await this.conn$.select(sql,cursor,1,true);

		if (!response.success)
		{
			Alert.warning("Unable to describe table '"+this.table$+"'","Database");
			return(false);
		}

		let columns:string[] = response.columns;

		for (let i = 0; i < columns.length; i++)
		{
			let type:string = response.types[i];
			let cname:string = columns[i].toLowerCase();
			let datatype:DataType = DataType[type.toLowerCase()];

			let exist:DataType = this.datatypes$.get(cname);
			if (!exist) this.datatypes$.set(cname,datatype);
		}

		this.described$ = response.success;
		return(this.described$);
	}

	private setTypes(bindvalues:BindValue[]) : void
	{
		bindvalues?.forEach((b) =>
		{
			let col:string = b.column?.toLowerCase();
			let t:DataType = this.datatypes$.get(col);
			if (t != null) b.type = DataType[t];
		})
	}

	private parse(response:any) : Record[]
	{
		let fetched:Record[] = [];
		this.eof$ = !response.more;
		let rows:any[][] = response.rows;

		if (!response.success)
		{
			this.eof$ = true;
			return(fetched);
		}

		if (this.primary$ == null)
			this.primary$ = this.columns$;

		let datetypes:DataType[] = [DataType.date, DataType.datetime, DataType.timestamp];

		let dates:boolean[] = [];

		for (let c = 0; c < this.columns.length; c++)
		{
			let dt:DataType = this.datatypes$.get(this.columns[c].toLowerCase());
			if (datetypes.includes(dt)) dates.push(true);
			else dates.push(false);
		}

		for (let r = 0; r < rows.length; r++)
		{
			let record:Record = new Record(this);

			for (let c = 0; c < rows[r].length; c++)
			{
				if (rows[r][c] && dates[c])
				{
					if (typeof rows[r][c] === "number")
						rows[r][c] = new Date().setTime(+rows[r][c]);
				}

				record.setValue(this.columns[c],rows[r][c]);
			}

			let response:any = {succes: true, rows: [rows[r]]};
			record.response = new DatabaseResponse(response, this.columns);

			fetched.push(record);
		}

		return(fetched);
	}

	private castResponse(response:any) : void
	{
		let rows:any[][] = response.rows;

		if (rows == null)
			return;

		let datetypes:DataType[] = [DataType.date, DataType.datetime, DataType.timestamp];

		for (let r = 0; r < rows.length; r++)
		{
			Object.keys(rows[r]).forEach((col) =>
			{
				col = col.toLowerCase();
				let value:any = rows[r][col];
				let dt:DataType = this.datatypes$.get(col);

				if (datetypes.includes(dt) && typeof value === "number")
					rows[r][col] = new Date(value);
			})
		}
	}

	private mergeColumns(list1:string[], list2:string[]) : string[]
	{
		let cname:string = null;
		let cnames:string[] = [];
		let columns:string[] = [];

		if (list1) columns.push(...list1);
		columns.forEach((col) => cnames.push(col.toLowerCase()));

		list2?.forEach((col) =>
		{
			if (!cnames.includes(col.toLowerCase()))
			{
				cname = col.toLowerCase();

				columns.push(col);
				cnames.push(cname);
			}
		})

		return(columns);
	}
}