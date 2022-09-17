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


export class ILike implements Filter
{
	private column$:string = null;
	private ltrunc:boolean = false;
	private rtrunc:boolean = false;
	private constraint$:string = null;

	public constructor(column:string)
	{
		this.column$ = column;
	}

	public get constraint() : string
	{
		return(this.constraint$);
	}

	public set constraint(value:string)
	{
		if (value == null) return;
		value = value.replace("*","%");

		if (value.endsWith("%")) this.rtrunc = true;
		if (value.startsWith("%")) this.ltrunc = true;

		if (this.ltrunc) value = value.substring(1);
		if (this.rtrunc) value = value.substring(0,value.length-1);

		this.constraint$ = value.toLocaleLowerCase();
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		if (this.column$ == null) return(false);
		let value:string = record.getValue(this.column$.toLowerCase())+"";

		if (this.constraint$ == null)
			return(true);

		if (value == null)
			return(false);

		value = value.toLocaleLowerCase();

		if (this.rtrunc && this.ltrunc)
		{
			if (value.includes(this.constraint$)) return(true);
			return(false);
		}

		if (this.rtrunc)
		{
			if (value.startsWith(this.constraint$)) return(true);
			return(false);
		}

		if (this.ltrunc)
		{
			if (value.endsWith(this.constraint$)) return(true);
			return(false);
		}

		return(value == this.constraint$);
	}
}