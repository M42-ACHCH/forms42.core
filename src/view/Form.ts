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

import { Block } from './Block.js';
import { Field } from './fields/Field.js';
import { Logger, Type } from '../application/Logger.js';
import { Form as InterfaceForm } from '../public/Form.js';
import { FieldInstance } from './fields/FieldInstance.js';
import { EventType } from '../control/events/EventType.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';
import { FormsModule } from '../application/FormsModule.js';

export class Form
{
	private static views:Map<InterfaceForm,Form> =
		new Map<InterfaceForm,Form>();

	public static drop(parent:InterfaceForm) : void
	{
		Form.views.delete(parent);
		Form.getForm(parent);
	}

	public static current() : Form
	{
		return(Form.curform$);
	}

	public static getForm(parent:InterfaceForm) : Form
	{
		let frm:Form = Form.views.get(parent);

		if (frm == null)
			frm = new Form(parent);

		return(frm);
	}

	public static finalize(parent:InterfaceForm) : void
	{
		let form:Form = Form.views.get(parent);
		form.blocks.forEach((blk) => {blk.finalize();});
		form.linkModels();
	}

	private static curform$:Form = null;
	private parent$:InterfaceForm = null;
	private curinst$:FieldInstance = null;
	private blocks:Map<string,Block> = new Map<string,Block>();

	private constructor(parent:InterfaceForm)
	{
		this.parent$ = parent;
		Form.views.set(parent,this);
		Logger.log(Type.formbinding,"Create viewform: "+this.parent$.constructor.name);
	}

	public get parent() : InterfaceForm
	{
		return(this.parent$);
	}

	public get block() : Block
	{
		return(this.curinst$?.field.block);
	}

	public get instance() : FieldInstance
	{
		return(this.curinst$);
	}

	public getBlock(name:string) : Block
	{
		return(this.blocks.get(name));
	}

	public addBlock(block:Block) : void
	{
		this.blocks.set(block.name,block);
		Logger.log(Type.formbinding,"Add block '"+block.name+"' to viewform: "+this.parent$.constructor.name);
	}

	public getField(block:string, field:string) : Field
	{
		return(this.getBlock(block)?.getField(field));
	}

	public focus() : void
	{
		this.curinst$?.focus();
	}

	public validated() : boolean
	{
		if (this.curinst$ == null)
			return(true);

		let block:Block = this.getBlock(this.curinst$.block);

		if (!block.validated)
		{
			this.focus();
			return(false);
		}

		return(true);
	}

	public async enter(inst:FieldInstance) : Promise<boolean>
	{
		let nxtblock:Block = inst.field.block;
		let recoffset:number = nxtblock.offset(inst);
		let preblock:Block = this.curinst$?.field.block;

		/**********************************************************************
			Go to form
		 **********************************************************************/

		if (this != Form.curform$)
		{
			let preform:Form = this;

			if (Form.curform$ != null)
			{
				preform = Form.curform$;

				// If not in call and not valid => return(false);

				if (!preform.validated)
				{
					preform.focus();
					return(false);
				}

				if (!await this.leaveForm(preform))
				{
					preform.focus();
					return(false);
				}
			}

			if (!await this.enterForm(this,nxtblock,recoffset))
			{
				preform.focus();
				return(false);
			}
		}

		/**********************************************************************
			Leave this forms current record and block
		 **********************************************************************/

		if (preblock != null)
		{
			// PostField already fired on blur

			if (preblock != nxtblock)
			{
				if (!await preblock.validate())
				{
					this.focus();
					return(false);
				}

				if (!await this.leaveRecord(preblock))
				{
					this.focus();
					return(false);
				}

				if (!await this.leaveBlock(preblock))
				{
					this.focus();
					return(false);
				}
			}
			else if (recoffset != 0)
			{
				if (!await nxtblock.validate())
				{
					this.focus();
					return(false);
				}

				if (!await this.leaveRecord(preblock))
				{
					this.focus();
					return(false);
				}
			}
		}

		/**********************************************************************
			Enter this forms current block and record
		 **********************************************************************/

		if (nxtblock != preblock)
		{
			if (!await this.enterBlock(nxtblock,recoffset))
			{
				this.focus();
				return(false);
			}

			if (!await this.enterRecord(nxtblock,recoffset))
			{
				this.focus();
				return(false);
			}
		}
		else if (recoffset != 0)
		{
			if (!await this.enterRecord(nxtblock,recoffset))
			{
				this.focus();
				return(false);
			}
		}

		// Prefield

		if (!await this.enterField(inst,recoffset))
		{
			this.focus();
			return(false);
		}

		Form.curform$ = this;
		this.curinst$ = inst;
		nxtblock.setCurrentRow(inst.row);

		return(true);
	}

	public async leave(inst:FieldInstance) : Promise<boolean>
	{
		//let recoffset:number = inst.field.block.offset(inst);
		if (!await this.LeaveField(inst))
		{
			Form.curform$.focus();
			return(false);
		}
		return(true);
	}

	public async enterForm(form:Form, block:Block, offset:number) : Promise<boolean>
	{
		block.model.setEventTransaction(EventType.PreForm,offset);
		let success:boolean = await this.fireFormEvent(EventType.PreForm,form.parent);
		block.model.endEventTransaction(success);
		if (success) this.setURL();
		return(success);
	}

	public async enterBlock(block:Block, offset:number) : Promise<boolean>
	{
		block.model.setEventTransaction(EventType.PreBlock,offset);
		let success:boolean = await this.fireBlockEvent(EventType.PreBlock,block.name);
		block.model.endEventTransaction(success);
		return(success);
	}

	public async enterRecord(block:Block, offset:number) : Promise<boolean>
	{
		block.model.setEventTransaction(EventType.PreRecord,offset);
		let success:boolean = await this.fireBlockEvent(EventType.PreRecord,block.name);
		block.model.endEventTransaction(success);
		return(success);
	}

	public async enterField(inst:FieldInstance, offset:number) : Promise<boolean>
	{
		inst.field.block.model.setEventTransaction(EventType.PreField,offset);
		let success:boolean = await this.fireFieldEvent(EventType.PreField,inst);
		inst.field.block.model.endEventTransaction(success);
		return(success);
	}

	public async leaveForm(form:Form) : Promise<boolean>
	{
		form.block.model.setEventTransaction(EventType.PostForm,0);
		let success:boolean = await this.fireFormEvent(EventType.PostForm,form.parent);
		form.block.model.endEventTransaction(success);
		return(success);
	}

	public async leaveBlock(block:Block) : Promise<boolean>
	{
		block.model.setEventTransaction(EventType.PostBlock,0);
		let success:boolean = await this.fireBlockEvent(EventType.PostBlock,block.name);
		block.model.endEventTransaction(success);
		return(success);
	}

	public async leaveRecord(block:Block) : Promise<boolean>
	{
		block.model.setEventTransaction(EventType.PostRecord,0);
		let success:boolean = await this.fireBlockEvent(EventType.PostRecord,block.name);
		block.model.endEventTransaction(success);
		return(success);
	}

	public async LeaveField(inst:FieldInstance) : Promise<boolean>
	{
		inst.field.block.model.setEventTransaction(EventType.PostField,0);
		let success:boolean = await this.fireFieldEvent(EventType.PostField,inst);
		inst.field.block.model.endEventTransaction(success);
		return(success);
	}

	private linkModels() : void
	{
		this.blocks.forEach((blk) => {blk.linkModel();});
	}

	public dumpFieldInstances() : void
	{
		this.block.dumpFieldInstances();
	}

	private setURL() : void
	{
		let location:Location = window.location;
		let params:URLSearchParams = new URLSearchParams(location.search);
		let path:string = location.protocol + '//' + location.host + location.pathname;

		let map:string = FormsModule.getFormPath(this.parent.constructor.name)

		if (map != null)
		{
			params.set("form",map)
			window.history.replaceState('', '',path+"?"+params);
		}
	}

	private async fireFormEvent(type:EventType, form:InterfaceForm) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.FormEvent(type,form);
		return(FormEvents.raise(frmevent));
	}

	private async fireBlockEvent(type:EventType, block:string) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.BlockEvent(type,this.parent,block);
		return(FormEvents.raise(frmevent));
	}

	private async fireFieldEvent(type:EventType, inst:FieldInstance) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.FieldEvent(type,inst);
		return(FormEvents.raise(frmevent));
	}
}