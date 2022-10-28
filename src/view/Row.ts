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
import { Field } from "./fields/Field.js";
import { Properties } from "../application/Properties.js";
import { FieldInstance } from "./fields/FieldInstance.js";
import { Indicator } from "../application/tags/Indicator.js";
import { FieldState } from "./fields/interfaces/FieldImplementation.js";
import { FieldFeatureFactory } from "./FieldFeatureFactory.js";

export enum Status
{
	na,
	qbe,
	new,
	update,
	insert,
	delete
}


export class Row
{
	private block$:Block = null;
	private rownum$:number = null;
	private validated$:boolean = true;
	private indicator$:boolean = false;
	private status$:Status = Status.na;
	private indicators:Indicator[] = [];
	private instances:FieldInstance[] = [];
	private state$:FieldState = FieldState.DISABLED;
	private fields:Map<string,Field> = new Map<string,Field>();

	constructor(block:Block, rownum:number)
	{
		this.block$ = block;
		this.rownum$ = rownum;
	}

	public get block() : Block
	{
		return(this.block$);
	}

	public get exist() : boolean
	{
		return(this.status != Status.na);
	}

	public get status() : Status
	{
		if (this.rownum >= 0) return(this.status$);
		else return(this.block.getCurrentRow().status$);
	}

	public set status(status:Status)
	{
		if (this.rownum >= 0) this.status$ = status;
		else this.block.getCurrentRow().status$ = status;
	}

	public get rownum() : number
	{
		return(this.rownum$);
	}

	public set rownum(rownum:number)
	{
		if (rownum == this.rownum$)
			return;

		this.rownum$ = rownum;

		this.indicators.forEach((ind) =>
		{ind.element.setAttribute("row",rownum+"")})

		this.getFields().forEach((fld) =>
		{
			fld.getInstances().forEach((inst) =>
			{inst.properties.row = rownum;})
		});
	}

	public setSingleRow() : void
	{
		this.rownum$ = 0;

		this.indicators.forEach((ind) =>
		{ind.element.setAttribute("row","0")})

		this.getFields().forEach((fld) =>
		{
			fld.getInstances().forEach((inst) =>
			{inst.properties.row = -1;})
		});
	}

	public setIndicator(ind:Indicator) : void
	{
		this.indicators.push(ind);
	}

	public activateIndicators(flag:boolean) : void
	{
		if (flag && this.indicator$) return;
		if (!flag && !this.indicator$) return;

		this.indicator$ = flag;

		this.indicators.forEach((ind) =>
		{
			if (flag) ind.element.classList.add(Properties.Classes.RowIndicator);
			else      ind.element.classList.remove(Properties.Classes.RowIndicator);
		})
	}

	public finalize() : void
	{
		this.getFields().forEach((fld) =>
		{
			fld.getInstances().forEach((inst) =>
			{inst.finalize();})
		});
	}

	public getFieldState() : FieldState
	{
		return(this.state$);
	}

	public setFieldState(state:FieldState) : void
	{
		this.state$ = state;
		if (state == FieldState.DISABLED) this.status$ = Status.na;
		this.getFieldInstances().forEach((inst) => {inst.setFieldState(state)});
	}

	public get validated() : boolean
	{
		if (this.status == Status.new) return(false);
		if (this.rownum >= 0) return(this.validated$);
		else return(this.block.getCurrentRow().validated$);
	}

	public set validated(flag:boolean)
	{
		this.validated$ = flag;
	}

	public invalidate() : void
	{
		if (this.rownum >= 0) this.validated = false;
		else this.block.getCurrentRow().validated = false;
		if (this.status == Status.new) this.status = Status.insert;
	}

	public async validateField(field:string) : Promise<boolean>
	{
		let inst:FieldInstance = this.getField(field)?.getInstance(0);
		if (inst) return(this.block.validateField(inst,inst.getValue()));
		return(false);
	}

	public async validate() : Promise<boolean>
	{
		if (this.validated)
			return(true);

		let valid:boolean = true;
		let validated:boolean = false;
		let fields:Field[] = this.getFields();

		for (let i = 0; i < fields.length; i++)
		{
			if (!fields[i].valid) valid = false;
			if (!fields[i].validated) validated = false;
		}

		if (this.rownum >= 0)
		{
			let curr:Row = this.block.getRow(-1);

			if (curr != null)
			{
				fields = curr.getFields();

				for (let i = 0; i < fields.length; i++)
				{
					if (!fields[i].valid) valid = false;
					if (!fields[i].validated) validated = false;
				}
			}
		}
		else
		{
			fields = this.block.getCurrentRow().getFields();

			for (let i = 0; i < fields.length; i++)
			{
				if (!fields[i].valid) valid = false;
				if (!fields[i].validated) validated = false;
			}
		}

		if (!valid) return(false);
		else
		{
			if (validated) this.validated = true;
			else this.validated = await this.block.model.validateRecord();
		}

		return(this.validated);
	}

	public addField(field:Field) : void
	{
		this.fields.set(field.name,field);
	}

	public addInstance(instance:FieldInstance) : void
	{
		this.instances.push(instance);
	}

	public focusable() : boolean
	{
		for (let i = 0; i < this.instances.length; i++)
		{
			if (this.instances[i].focusable())
				return(true);
		}

		return(false);
	}

	public getFieldIndex(inst:FieldInstance) : number
	{
		return(this.getFieldInstances().indexOf(inst));
	}

	public getFieldByIndex(idx:number) : FieldInstance
	{
		return(this.getFieldInstances()[idx]);
	}

	public prevField(inst:FieldInstance) : FieldInstance
	{
		let prev:number = -1;
		let pos:number = this.instances.length - 1;

		if (inst != null)
			pos = this.instances.indexOf(inst) - 1;

		for (let i = pos; i >= 0; i--)
		{
			if (this.instances[i].focusable())
			{
				prev = i;
				break;
			}
		}

		if (prev < 0)
		{
			if (this.rownum >= 0)
			{
				let current:Row = this.block.getRow(-1);

				if (current != null && current.focusable())
					return(current.prevField(null));
			}
			else
			{
				let mrow:Row = this.block.getCurrentRow();

				if (mrow != null && mrow.focusable())
					return(mrow.prevField(null));
			}
		}

		if (prev < 0)
		{
			for (let i = this.instances.length - 1; i >= 0; i--)
			{
				if (this.instances[i].focusable())
					return(this.instances[i]);
			}
		}

		return(this.instances[prev]);
	}


	public nextField(inst:FieldInstance) : FieldInstance
	{
		let pos:number = 0;
		let next:number = -1;

		if (inst != null)
			pos = this.instances.indexOf(inst) + 1;

		for (let i = pos; i < this.instances.length; i++)
		{
			if (this.instances[i].focusable())
			{
				next = i;
				break;
			}
		}

		if (next < 0)
		{
			if (this.rownum >= 0)
			{
				let current:Row = this.block.getRow(-1);

				if (current != null && current.focusable())
					return(current.nextField(null));
			}
			else
			{
				let mrow:Row = this.block.getCurrentRow();

				if (mrow != null && mrow.focusable())
					return(mrow.nextField(null));
			}
		}

		if (next < 0)
		{
			for (let i = 0; i < this.instances.length; i++)
			{
				if (this.instances[i].focusable())
					return(this.instances[i]);
			}
		}

		return(this.instances[next]);
	}

	public getField(name:string) : Field
	{
		return(this.fields.get(name));
	}

	public getFields() : Field[]
	{
		let fields:Field[] = [];

		this.fields.forEach((fld) =>
		{fields.push(fld)});

		return(fields);
	}

	public clear() : void
	{
		this.activateIndicators(false);
		this.getFields().forEach((fld) => {fld.clear()});
	}

	public setState(state:Status) : void
	{
		this.status = state;

		this.instances.forEach((inst) =>
			{inst.resetProperties()})
	}

	public distribute(field:string, value:any, dirty:boolean) : void
	{
		this.fields.get(field)?.distribute(null,value,dirty);
	}

	public getFieldInstances() : FieldInstance[]
	{
		let instances:FieldInstance[] = [];

		this.getFields().forEach((field) =>
		{instances.push(...field.getInstances());});

		return(instances);
	}

	public getFirstInstance(status:Status) : FieldInstance
	{
		let flds:Field[] = this.getFields();

		for (let f = 0; f < flds.length; f++)
		{
			for (let i = 0; i < flds[f].getInstances().length; i++)
			{
				let inst:FieldInstance = flds[f].getInstance(i);
				if (inst.focusable(status)) return(inst);
			}
		}

		return(null);
	}

	public getFirstEditableInstance(status:Status) : FieldInstance
	{
		let flds:Field[] = this.getFields();

		for (let f = 0; f < flds.length; f++)
		{
			for (let i = 0; i < flds[f].getInstances().length; i++)
			{
				let inst:FieldInstance = flds[f].getInstance(i);
				if (inst.editable(status)) return(inst);
			}
		}

		return(null);
	}
}