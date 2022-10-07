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

import { Record } from "./Record.js";
import { Filter } from "./interfaces/Filter.js";
import { BindValue } from "../database/BindValue.js";

export class FilterStructure
{
	private entries$:Constraint[] = [];

	private fieldidx$:Map<string,Constraint> =
		new Map<string,Constraint>();

	private filteridx$:Map<Filter|FilterStructure,Constraint> =
		new Map<Filter|FilterStructure,Constraint>();

	public get empty() : boolean
	{
		return(this.getFilters().length == 0);
	}

	public size() : number
	{
		return(this.entries$.length);
	}

	public hasChildFilters() : boolean
	{
		for (let i = 0; i < this.entries$.length; i++)
		{
			if (this.entries$[i].isFilter())
				return(true);
		}
		return(false);
	}

	public clear(name?:string) : void
	{
		if (name == null)
		{
			this.entries$ = [];
			this.fieldidx$.clear();
			this.filteridx$.clear();
		}
		else
		{
			this.delete(name);
		}
	}

	public or(filter:Filter|FilterStructure, name?:string) : void
	{
		if (filter == this)
			return;

		if (name != null)
			this.delete(name);

		if (!this.filteridx$.has(filter))
		{
			let cstr:Constraint = new Constraint(false,filter,name);
			if (name) this.fieldidx$.set(name.toLowerCase(),cstr);
			this.filteridx$.set(filter,cstr);
			this.entries$.push(cstr);
		}
	}

	public and(filter:Filter|FilterStructure, name?:string) : void
	{
		if (filter == this)
			return;

		if (name != null)
			this.delete(name);

		if (!this.filteridx$.has(filter))
		{
			let cstr:Constraint = new Constraint(true,filter,name);
			if (name) this.fieldidx$.set(name.toLowerCase(),cstr);
			this.filteridx$.set(filter,cstr);
			this.entries$.push(cstr);
		}
	}

	public get(field:string) : Filter|FilterStructure
	{
		return(this.fieldidx$.get(field?.toLowerCase())?.filter);
	}

	public getFilter(field:string) : Filter
	{
		let constr:Constraint = this.fieldidx$.get(field?.toLowerCase());
		if (!constr || !constr.isFilter()) return(null);
		return(constr.filter as Filter);
	}

	public getFilterStructure(field:string) : FilterStructure
	{
		let constr:Constraint = this.fieldidx$.get(field?.toLowerCase());
		if (!constr || constr.isFilter()) return(null);
		return(constr.filter as FilterStructure);
	}

	public delete(filter:string|Filter|FilterStructure) : boolean
	{
		let found:boolean = false;

		for (let i = 0; i < this.entries$.length; i++)
		{
			if (!this.entries$[i].isFilter())
			{
				if ((this.entries$[i].getFilterStructure()).delete(filter))
					found = true;
			}
		}

		if (typeof filter === "string")
			filter = this.get(filter);

		let cstr:Constraint = this.filteridx$.get(filter);

		if (cstr != null)
		{
			let pos:number = this.entries$.indexOf(cstr);

			if (pos >= 0)
			{
				found = true;
				this.entries$.splice(pos,1);
				this.filteridx$.delete(filter);
				this.fieldidx$.delete(cstr.name);
			}
		}

		return(found);
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		let match:boolean = true;

		for (let i = 0; i < this.entries$.length; i++)
		{
			if (match && this.entries$[i].or)
				continue;

			if (!match && this.entries$[i].and)
				continue;

			match = await this.entries$[i].matches(record);
		}

		return(match);
	}

	public asSQL() : string
	{
		return(this.build(0));
	}

	public getBindValues() : BindValue[]
	{
		let bindvalues:BindValue[] = [];

		let filters:Filter[] = this.getFilters();
		filters.forEach((filter) => bindvalues.push(...filter.getBindValues()));

		return(bindvalues);
	}

	private build(clauses:number) : string
	{
		let stmt:string = "";
		let first:boolean = true;

		for (let i = 0; i < this.entries$.length; i++)
		{
			let constr:Constraint = this.entries$[i];

			if (constr.filter instanceof FilterStructure)
			{
				if (constr.filter.hasChildFilters())
				{
					if (clauses > 0) stmt += " " + constr.opr + " ";
					stmt += "(" + constr.filter.build(clauses) + ")";
					first = false;
					clauses++;
				}
				else
				{
					stmt += constr.filter.build(clauses);
				}
			}
			else
			{
				if (!first)
					stmt += " " + constr.opr + " ";

				stmt += constr.filter.asSQL();
				first = false;
				clauses++;
			}
		}

		return(stmt);
	}

	public getFilters(start?:FilterStructure) : Filter[]
	{
		let filters:Filter[] = [];
		if (start == null) start = this;

		for (let i = 0; i < start.entries$.length; i++)
		{
			if (start.entries$[i].isFilter())
			{
				filters.push(start.entries$[i].filter as Filter);
			}
			else
			{
				filters.push(...this.getFilters(start.entries$[i].filter as FilterStructure))
			}
		}

		return(filters);
	}

	public printable() : Printable
	{
		let p:Printable = new Printable();

		for (let i = 0; i < this.entries$.length; i++)
		{
			let name:string = this.entries$[i].name;

			if (this.entries$[i].isFilter())
			{
				p.entries.push({name: name, filter: this.entries$[i].filter})
			}
			else
			{
				let sub:FilterStructure = this.entries$[i].getFilterStructure();
				p.entries.push({name: name, sub: sub.printable()})
			}
		}

		return(p);
	}

	public toString() : string
	{
		return(this.asSQL());
	}
}

class Constraint
{
	constructor(public and$:boolean, public filter:Filter|FilterStructure, public name:string) {}

	get or() : boolean
	{
		return(!this.and$);
	}

	get and() : boolean
	{
		return(this.and$);
	}

	get opr() : string
	{
		if (this.and) return("and");
		return("or");
	}

	isFilter() : boolean
	{
		return(!(this.filter instanceof FilterStructure));
	}

	getFilter() : Filter
	{
		return(this.filter as Filter);
	}

	getFilterStructure() : FilterStructure
	{
		return(this.filter as FilterStructure);
	}

	async matches(record:Record) : Promise<boolean>
	{
		return(this.filter.evaluate(record));
	}
}

export class Printable
{
	entries:any[] = [];
}