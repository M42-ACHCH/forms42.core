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

import { QueryFilter } from "./QueryFilter.js";
import { DataSource } from "../model/interfaces/DataSource.js";

export class ListOfValues
{
	public rows:number = 8;
	public title:string = null;
	public cssclass:string = null;
	public filter:QueryFilter = null;
	public datasource:DataSource = null;
	public displayfields:string|string[];

	public sourcefields:string|string[];
	public targetfields:string|string[];
}