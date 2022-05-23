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

import { KeyMap } from "./KeyMap.js";
import { EventType } from "./EventType.js";
import { Form } from "../../public/Form.js";
import { Field } from "../../public/Field.js";
import { Block } from "../../public/Block.js";
import { EventFilter } from "./EventFilter.js";
import { EventListener } from "./EventListener.js";
import { Form as ModelForm } from "../../model/Form.js";
import { FieldInstance } from "../../public/FieldInstance.js";



export class KeyEventSource
{
	constructor(public key:KeyMap, public field:string, public block:string, public record:number, public form:Form) {}
}


export class FormEvent
{
	public static newFormEvent(type:EventType, form:Form, cause?:Event) : FormEvent
	{
		return(new FormEvent(type,form, cause));
	}

	public static newFieldEvent(type:EventType, form:Form, cause?:Event, block?:string, field?:string) : FormEvent
	{
		return(new FormEvent(type,form,cause,block,field));
	}

	public static newKeyEvent(form:Form, key:KeyMap, cause?:Event, block?:string, field?:string) : FormEvent
	{
		return(new FormEvent(EventType.Key,form,cause,block,field,key));
	}


	private constructor
	(
		public type:EventType,
		public form:Form,
		public cause:Event,
		public blockname?:string,
		public fieldname?:string,
		public key?:KeyMap
	) {}

	public get source() : FieldInstance
	{
		if (this.cause?.target instanceof HTMLElement)
			return(this.form.getFieldInstance(this.cause.target));
		return(null);
	}

	public get field() : Field
	{
		let inst:FieldInstance = this.source;
		return(inst?.field);
	}

	public get block() : Block
	{
		return(ModelForm.getForm(this.form)?.getBlock(this.blockname)?.interface);
	}

	public toString() : string
	{
		let str:string = EventType[this.type];
		if (this.blockname != null) str += " block: "+this.blockname;
		if (this.fieldname != null) str += " field: "+this.fieldname;
		if (this.key != null) str += " key: "+this.key;
		return(str);
	}
}


export class FormEvents
{
	private static listeners:EventListener[] = [];
	private static applisteners:Map<EventType,EventListener[]> = new Map<EventType,EventListener[]>();
	private static frmlisteners:Map<EventType,EventListener[]> = new Map<EventType,EventListener[]>();
	private static blklisteners:Map<EventType,EventListener[]> = new Map<EventType,EventListener[]>();
	private static fldlisteners:Map<EventType,EventListener[]> = new Map<EventType,EventListener[]>();

	public static addListener(form:Form, clazz:any, method:Function|string, filter?:EventFilter|EventFilter[]) : object
	{
		let id:object = new Object();
		let listeners:EventListener[] = [];

		if (filter == null)
		{
			listeners.push(new EventListener(id,form,clazz,method,null));
		}
		else if (!Array.isArray(filter))
		{
			listeners.push(new EventListener(id,form,clazz,method,filter as EventFilter));
		}
		else
		{
			filter.forEach((f) => {listeners.push(new EventListener(id,form,clazz,method,f));})
		}

		listeners.forEach((lsnr) =>
		{
			let ltype:number = 0;
			if (lsnr.form != null) ltype = 1;

			if (lsnr.filter != null)
			{
				if (lsnr.filter.field != null) lsnr.filter.field = lsnr.filter.field.toLowerCase();
				if (lsnr.filter.block != null) lsnr.filter.block = lsnr.filter.block.toLowerCase();

				if (lsnr.filter.block != null) ltype = 2;
				if (lsnr.filter.field != null) ltype = 3;

				switch(ltype)
				{
					case 0: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.applisteners); break;
					case 1: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.frmlisteners); break;
					case 2: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.blklisteners); break;
					case 3: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.fldlisteners); break;
				}
			}
			else FormEvents.listeners.push(lsnr);
		});

		return(id);
	}


	public static removeListener(id:object) : void
	{
		let map:Map<EventType,EventListener[]> = null;

		for (let i = 0; i < FormEvents.listeners.length; i++)
		{
			let lsnr:EventListener = FormEvents.listeners[i];

			if (lsnr.id == id)
			{
				delete FormEvents.listeners[i];
				break;
			}
		}

		for (let m = 0; m < 4; m++)
		{
			switch(m)
			{
				case 0: map = FormEvents.fldlisteners; break;
				case 1: map = FormEvents.blklisteners; break;
				case 2: map = FormEvents.frmlisteners; break;
				case 3: map = FormEvents.applisteners; break;
			}

			for(let key of map.keys())
			{
				let listeners:EventListener[] = map.get(key);

				for (let i = 0; listeners != null &&  i < listeners.length; i++)
				{
					if (listeners[i].id == id)
					{
						delete listeners[i];
						map.set(key,listeners);

						if (listeners.length == 0)
							map.delete(key);

						break;
					}
				}
			}
		}
	}


	public static async raise(event:FormEvent) : Promise<boolean>
	{
		let listeners:EventListener[] = null;

		if (event.fieldname != null)
			event.fieldname = event.fieldname.toLowerCase();

		if (event.blockname != null)
			event.blockname = event.blockname.toLowerCase();

		let done:Set<object> = new Set<object>();

		// Field Listeners
		listeners = FormEvents.fldlisteners.get(event.type);
		for (let i = 0; listeners != null && i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				if (!(await FormEvents.execute(lsnr,event)))
					return(false);
			}
		}

		// Block Listeners
		listeners = FormEvents.blklisteners.get(event.type);
		for (let i = 0; listeners != null && i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				if (!(await FormEvents.execute(lsnr,event)))
					return(false);
			}
		}

		// Form Listeners
		listeners = FormEvents.frmlisteners.get(event.type);
		for (let i = 0; listeners != null && i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				if (!(await FormEvents.execute(lsnr,event)))
					return(false);
			}
		}

		// App Listeners
		listeners = FormEvents.applisteners.get(event.type);
		for (let i = 0; listeners != null && i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				if (!(await FormEvents.execute(lsnr,event)))
					return(false);
			}
		}

		for (let i = 0; i < FormEvents.listeners.length; i++)
		{
			let lsnr:EventListener = FormEvents.listeners[i];
			if (!done.has(lsnr))
			{
				done.add(lsnr.id);

				if (!(await FormEvents.execute(lsnr,event)))
					return(false);
			}
		}

		return(true);
	}


	private static async execute(lsnr:EventListener, event:FormEvent) : Promise<boolean>
	{
		let cont:boolean = true;
		let response:Promise<boolean> = lsnr.clazz[lsnr.method](event);

		if (response instanceof Promise)
		{
			await response.then((value) =>
			{
				if (typeof value !== "boolean")
					throw "@FormEvents: EventListner '"+lsnr.method+"' did not return boolean";

				cont = value;
			});
		}
		else
		{
			if (response != null && typeof response !== "boolean")
				throw "@FormEvents: EventListner '"+lsnr.method+"' did not return boolean";

			if (typeof response === "boolean")
				cont = response;
		}

		return(cont);
	}


	private static match(event:FormEvent, lsnr:EventListener) : boolean
	{
		if (lsnr.form != null && lsnr.form != event.form)
			return(false);

		if (lsnr.filter != null)
		{
			if (lsnr.filter.block != null && lsnr.filter.block != event.blockname) return(false);
			if (lsnr.filter.field != null && lsnr.filter.field != event.fieldname) return(false);
		}

		return(true);
	}


	private static add(type:EventType, lsnr:EventListener, map:Map<EventType,EventListener[]>) : void
	{
		let listeners:EventListener[] = map.get(type);

		if (listeners == null)
		{
			listeners = [];
			map.set(type,listeners);
		}

		listeners.push(lsnr);
	}
}