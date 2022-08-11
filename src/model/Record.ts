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

import { Block } from "./Block.js";
import { DataSourceWrapper } from "./DataModel.js";
import { DataSource } from "./interfaces/DataSource.js";

export enum RecordStatus
{
	Query,
	Insert,
	Update,
	Delete
}

export class Record
{
	private id$:any;
	private keys$:any[] = [];
	private values$:any[] = [];
	private columns$:string[] = [];
	private locked$:boolean = false;
	private prepared$:boolean = false;
	private source$:DataSource = null;
	private wrapper$:DataSourceWrapper = null;
	private status$:RecordStatus = RecordStatus.Query;

	constructor(source:DataSource, columns?:{[name:string]: any})
	{
		this.source$ = source;
		this.id$ = new Object();

		if (columns == null)
		{
			this.status$ = RecordStatus.Insert;
		}
		else
		{
			Object.keys(columns).forEach((col) =>
			{
				col = col.toLowerCase();

				let idx:number = this.indexOf(col);
				if (idx >= 0) this.values$[idx] = columns[col];
			});
		}
	}

	public get id() : any
	{
		return(this.id$);
	}

	public get keys() : any[]
	{
		return(this.keys$);
	}

	public get block() : Block
	{
		return(this.wrapper$?.block);
	}

	public get source() : DataSource
	{
		return(this.source$);
	}

	public get wrapper() : DataSourceWrapper
	{
		return(this.wrapper$);
	}

	public set wrapper(wrapper:DataSourceWrapper)
	{
		this.wrapper$ = wrapper;
	}

	public get locked() : boolean
	{
		return(this.locked$);
	}

	public set locked(flag:boolean)
	{
		this.locked$ = flag;
	}

	public get prepared() : boolean
	{
		return(this.prepared$);
	}

	public set prepared(flag:boolean)
	{
		this.prepared$ = flag;
	}

	public get columns() : string[]
	{
		let columns:string[] = [];
		columns.push(...this.source.columns);
		columns.push(...this.columns$);
		return(columns);
	}

	public get values() : {name:string,value:any}[]
	{
		let values:{name:string, value:any}[] = [];

		for (let i = 0; i < this.values$.length; i++)
			values.push({name: this.column(i), value: this.values$[i]});

		return(values);
	}

	public get status() : RecordStatus
	{
		return(this.status$);
	}

	public set status(status:RecordStatus)
	{
		this.status$ = status;
	}

	public addKey(value:any) : void
	{
		this.keys$.push(value);
	}

	public getValue(column:string) : any
	{
		column = column.toLowerCase();
		if (this.source == null) return(null);
		let idx:number = this.indexOf(column);
		return(this.values$[idx]);
	}

	public setValue(column:string,value:any) : void
	{
		column = column.toLowerCase();
		let idx:number = this.indexOf(column);

		if (this.status == RecordStatus.Query)
			this.status = RecordStatus.Update;

		if (idx < 0)
		{
			idx = this.cols;
			this.push(column);
		}

		this.values$[idx] = value;
	}

	private get cols() : number
	{
		return(this.source.columns.length+this.columns$.length);
	}

	private push(column:string) : void
	{
		this.columns$.push(column);
	}

	private indexOf(column:string) : number
	{
		let idx:number = this.source.columns.indexOf(column);

		if (idx < 0 && this.columns$ != null)
		{
			idx = this.columns$.indexOf(column);
			if (idx >= 0) idx += this.source.columns.length;
			else return(-1);
		}

		return(idx);
	}

	private column(pos:number) : string
	{
		let len:number = this.source.columns.length;
		if (pos >= len) return(this.columns$[pos-len]);
		else    		return(this.source.columns[pos]);
	}

	public toString() : string
	{
		let str:string = "";

		for (let i = 0; i < this.cols; i++)
			str += ", "+this.column(i)+"="+this.getValue(this.column(i));

		return(str.substring(2));
	}
}