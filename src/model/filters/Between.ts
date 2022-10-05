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

import { Record } from "../Record.js";
import { Filter } from "../interfaces/Filter.js";
import { BindValue } from "../../database/BindValue.js";


export class Between implements Filter
{
	private fr:any = null;
	private to:any = null;
	private incl:boolean = false;

	private column$:string = null;
	private bindval$:string = null;
	private constraint$:any[] = null;
	private bindvalues$:BindValue[] = null;

	public constructor(column:string, incl?:boolean)
	{
		this.incl = incl;
		this.column$ = column;
		this.bindval$ = column;
	}

	public clear() : void
	{
		this.constraint$ = null;
	}

	public getBindValueName() : string
	{
		return(this.bindval$);
	}

	public setBindValueName(name:string) : Filter
	{
		this.bindval$ = name;
		return(this);
	}

	public setConstraint(values:any[]) : Filter
	{
		this.constraint = values;
		return(this);
	}

	public get constraint() : any|any[]
	{
		return(this.constraint$);
	}

	public set constraint(values:any[])
	{
		this.constraint$ = [];
		if (values == null) return;
		if (values.length != 2) return;

		this.bindvalues$ = null;
		this.constraint$ = values;

		this.fr = this.constraint$[0];
		this.to = this.constraint$[1];
	}

	public getBindValues(): BindValue[]
	{
		if (this.bindvalues$ == null)
		{
			let b1:BindValue = new BindValue(this.bindval$+"0",this.fr);
			let b2:BindValue = new BindValue(this.bindval$+"1",this.to);

			b1.column = this.column$;
			b2.column = this.column$;

			this.bindvalues$ = [b1,b2];
		}

		return(this.bindvalues$);
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		if (this.column$ == null) return(false);
		if (this.constraint$ == null) return(false);
		let value:any = record.getValue(this.column$.toLowerCase());

		if (this.incl) return(value >= this.fr && value <= this.to);
		return(value > this.fr && value < this.to);
	}

	public asSQL() : string
	{
		if (this.constraint$ == null)
			return("1 == 2");

		let lt:string = "<";
		let gt:string = ">";

		if (this.bindval$ == null)
			this.bindval$ = this.column$;

		if (this.incl)
		{
			lt = "<=";
			gt = ">=";
		}

		let whcl:string = this.column$ + " " + gt + " :"+this.bindval$ + "0" +
								" and " +
								this.column$ + " " + lt + " :"+this.bindval$ + "1";

		return(whcl)
	}
}