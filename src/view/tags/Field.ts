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

import { Tag } from "./Tag.js";
import { Form } from "../../public/Form.js";
import { FieldInstance } from "../fields/FieldInstance.js";

export class Field implements Tag
{
    public parse(component:any, tag:HTMLElement, _attr:string) : HTMLElement
    {
		if (component == null)
			throw "@Field: component is null";

		if (!(component instanceof Form))
			throw "@Field: Fields cannot be placed on non-forms "+component.constructor.name;

		let field:FieldInstance = new FieldInstance(component,tag);
        return(field.element);
    }
}