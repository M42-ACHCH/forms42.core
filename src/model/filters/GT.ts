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


export class GT implements Filter
{
	private incl:boolean = false;
	private column$:string = null;
	private constraint$:any = null;

	public constructor(column:string, incl?:boolean)
	{
		this.incl = incl;
		this.column$ = column;
	}

	public clear() : void
	{
		this.constraint$ = null;
	}

	public get constraint() : any
	{
		return(this.constraint$);
	}

	public set constraint(value:any)
	{
		this.constraint$ = value;
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		if (this.column$ == null) return(false);
		if (this.constraint$ == null) return(false);

		let value:any = record.getValue(this.column$.toLowerCase());

		if (this.incl) return(value >= this.constraint$);
		return(value > this.constraint$);
	}

	public asSQL(id:number): string
	{
		if (id == null) id = 0;
		let gt:string = this.incl ? ">=" : ">";
		let whcl:string = this.column$ + " "+gt+" :"+this.column$+id;
		return(whcl)
	}
}