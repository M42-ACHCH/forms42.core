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

import { DataType } from "./DataType.js";
import { BrowserEvent } from "../../BrowserEvent.js";
import { dates } from "../../../model/dates/dates.js";
import { HTMLProperties } from "../HTMLProperties.js";
import { DataConverter, Tier } from "../DataConverter.js";
import { FieldProperties } from "../../FieldProperties.js";
import { FieldEventHandler } from "../interfaces/FieldEventHandler.js";
import { FieldImplementation, FieldState } from "../interfaces/FieldImplementation.js";

export class Radio implements FieldImplementation, EventListenerObject
{
	private state:FieldState = null;
	private properties:HTMLProperties = null;
	private dataconverter:DataConverter = null;
	private eventhandler:FieldEventHandler = null;

	private value$:string = null;
	private checked:string = null;
	private element:HTMLInputElement = null;
	private datatype:DataType = DataType.string;
    private event:BrowserEvent = BrowserEvent.get();

	public create(eventhandler:FieldEventHandler, _tag:string) : HTMLInputElement
	{
		this.element = document.createElement("input");
		this.eventhandler = eventhandler;
		return(this.element);
	}

	public apply(properties:HTMLProperties) : void
	{
		this.properties = properties;
		properties.apply(this.element);
		this.checked = properties.value;
		this.setAttributes(properties.getAttributes());
		if (properties.init) this.addEvents(this.element);
	}

	public getValue() : any
	{
		if (this.dataconverter != null)
		{
			this.value$ = this.dataconverter.getValue(Tier.Backend);
			if (this.value$ == null) this.element.checked = false;
			return(this.value$);
		}

		if (DataType[this.datatype].startsWith("date"))
		{
			let value:Date = dates.parse(this.value$);
			if (value == null) this.element.checked = false;
			return(value);
		}

		if (this.datatype == DataType.integer || this.datatype == DataType.decimal)
			return(+this.value$);

		return(this.value$);
	}

	public setValue(value:any) : boolean
	{
		if (this.dataconverter != null)
		{
			this.dataconverter.setValue(Tier.Backend,value);
			value = this.dataconverter.getValue(Tier.Frontend);
		}

		if (DataType[this.datatype].startsWith("date"))
		{
			if (typeof value === "number")
				value = new Date(+value);

			if (value instanceof Date)
				value = dates.format(value);
		}

		this.value$ = value;
		let comp:string = "";

		if (value != null) comp = value+"";
		this.element.checked = (comp == this.checked);

		return(true);
	}

	public getIntermediateValue() : string
	{
		return(this.getValue());
	}

	public setIntermediateValue(value:string) : void
	{
		this.setValue(value);
	}

	public getElement() : HTMLElement
	{
		return(this.element);
	}

	public getFieldState() : FieldState
	{
		return(this.state);
	}

	public setFieldState(state:FieldState) : void
	{
		this.state = state;
		let enabled:boolean = this.properties.enabled;
		let readonly:boolean = this.properties.readonly;

		switch(state)
		{
			case FieldState.OPEN:
				if (enabled) FieldProperties.setEnabledState(this.element,this.properties,true);
				if (!readonly) FieldProperties.setReadOnlyState(this.element,this.properties,false);
				break;

			case FieldState.READONLY:
				if (enabled) FieldProperties.setEnabledState(this.element,this.properties,true);
				FieldProperties.setReadOnlyState(this.element,this.properties,true);
				break;

			case FieldState.DISABLED:
				FieldProperties.setEnabledState(this.element,this.properties,false);
				break;
			}
	}


	public setAttributes(attributes:Map<string,string>) : void
	{
		this.datatype = DataType.string;

		attributes.forEach((_value,attr) =>
        {
			if (attr == "date")
				this.datatype = DataType.date;

			if (attr == "datetime")
				this.datatype = DataType.datetime;

			if (attr == "integer")
				this.datatype = DataType.integer;

			if (attr == "decimal")
				this.datatype = DataType.decimal;
		});
	}

	public async handleEvent(event:Event) : Promise<void>
	{
        let bubble:boolean = false;
		this.event.setEvent(event);

		if (this.event.type == "focus")
			bubble = true;

		if (this.event.type == "blur")
			bubble = true;

		if (this.event.type == "change")
		{
			bubble = true;
			this.value$ = this.getElementValue();

			if (!this.element.checked)
				this.value$ = null;
		}

		if (this.event.accept || this.event.cancel)
			bubble = true;

		if (this.event.type.includes("click"))
			bubble = true;

		if (this.event.onScrollUp)
			bubble = true;

        if (this.event.onScrollDown)
			bubble = true;

        if (this.event.onCtrlKeyDown)
			bubble = true;

        if (this.event.onFuncKey)
			bubble = true;

		this.event.preventDefault();

		if (this.event.navigation) bubble = true;
		else if (this.event.ignore) return;

		if (bubble)
			await this.eventhandler.handleEvent(this.event);
	}

	private getElementValue() : string
	{
		return(this.element.value);
	}

    private addEvents(element:HTMLElement) : void
    {
        element.addEventListener("blur",this);
        element.addEventListener("focus",this);
        element.addEventListener("change",this);

        element.addEventListener("keyup",this);
        element.addEventListener("keydown",this);
        element.addEventListener("keypress",this);

        element.addEventListener("wheel",this);
        element.addEventListener("mouseup",this);
        element.addEventListener("mouseout",this);
        element.addEventListener("mousedown",this);
        element.addEventListener("mouseover",this);
        element.addEventListener("mousemove",this);

        element.addEventListener("drop",this);
        element.addEventListener("dragover",this);

        element.addEventListener("click",this);
        element.addEventListener("dblclick",this);
        element.addEventListener("contextmenu",this);
    }
}