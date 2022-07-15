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
import { DataMapper, Tier } from "../DataMapper.js";
import { BrowserEvent } from "../../BrowserEvent.js";
import { dates } from "../../../model/dates/dates.js";
import { FieldProperties } from "../FieldProperties.js";
import { FieldFeatureFactory } from "../../FieldFeatureFactory.js";
import { FieldEventHandler } from "../interfaces/FieldEventHandler.js";
import { FieldImplementation, FieldState } from "../interfaces/FieldImplementation.js";

export class Display implements FieldImplementation, EventListenerObject
{
	private state:FieldState = null;
	private datamapper:DataMapper = null;
	private properties:FieldProperties = null;
	private eventhandler:FieldEventHandler = null;

	private value$:any = null;
	private element:HTMLElement = null;
	private datatype:DataType = DataType.string;
    private event:BrowserEvent = BrowserEvent.get();

	public create(eventhandler:FieldEventHandler, tag:string) : HTMLElement
	{
		this.element = document.createElement(tag);
		this.eventhandler = eventhandler;
		return(this.element);
	}

	public apply(properties:FieldProperties, init:boolean) : void
	{
		this.properties = properties;
		if (init) this.addEvents(this.element);
		this.setAttributes(properties.getAttributes());
	}

	public clear() : void
	{
		if (this.value$ != null)
		{
			if (this.value$ instanceof HTMLElement) this.element.firstChild?.remove;
			else this.element.textContent = "";
		}
	}

	public getValue() : any
	{
		if (this.datamapper != null)
		{
			this.value$ = this.datamapper.getValue(Tier.Backend);
			if (this.value$ == null) this.clear();
			return(this.value$);
		}

		if (DataType[this.datatype].startsWith("date"))
		{
			let value:Date = dates.parse(this.value$);
			if (value == null) this.clear();
			return(value);
		}

		if (this.datatype == DataType.integer || this.datatype == DataType.decimal)
			return(+this.value$);

		return(this.value$);
	}

	public setValue(value:any) : boolean
	{
		if (this.datamapper != null)
		{
			this.datamapper.setValue(Tier.Backend,value);
			value = this.datamapper.getValue(Tier.Frontend);
		}

		if (DataType[this.datatype].startsWith("date"))
		{
			if (typeof value === "number")
				value = new Date(+value);

			if (value instanceof Date)
				value = dates.format(value);
		}

		this.clear();
		this.value$ = value;

		if (value != null)
		{
			if (value instanceof HTMLElement) this.element.appendChild(value);
			else this.element.textContent = value;
		}

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
				if (enabled) FieldFeatureFactory.setEnabledState(this.element,this.properties,true);
				if (!readonly) FieldFeatureFactory.setReadOnlyState(this.element,this.properties,false);
				break;

			case FieldState.READONLY:
				if (enabled) FieldFeatureFactory.setEnabledState(this.element,this.properties,true);
				FieldFeatureFactory.setReadOnlyState(this.element,this.properties,true);
				break;

			case FieldState.DISABLED:
				FieldFeatureFactory.setEnabledState(this.element,this.properties,false);
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

		if (this.event.type == "wait")
			await this.event.wait();

		if (this.event.waiting)
			return;

		if (this.event.type == "focus")
			bubble = true;

		if (this.event.type == "blur")
			bubble = true;

		if (this.event.accept || this.event.cancel)
			bubble = true;

		if (this.event.bubbleMouseEvent)
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

		if (bubble)
			await this.eventhandler.handleEvent(this.event);
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