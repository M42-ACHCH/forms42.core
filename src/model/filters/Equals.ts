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


export class Equals implements Filter
{
	private column$:string = null;
	private constraint$:any = null;

	public constructor(column:string)
	{
		this.column$ = column;
	}

	public get constraint() : string
	{
		return(this.constraint$);
	}

	public set constraint(value:any)
	{
		this.constraint$ = value;
	}

	public async matches(record:Record) : Promise<boolean>
	{
		let val:any = record.getValue(this.column$);
		return(val == this.constraint$);
	}
}