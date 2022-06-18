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

import { Class } from "../../types/Class.js";
import { Radio } from "./implementations/Radio.js";
import { Input } from "./implementations/Input.js";
import { Select } from "./implementations/Select.js";
import { FieldImplementation } from "./interfaces/FieldImplementation.js";


export class FieldTypes
{
	private static implementations:Map<string,Class<FieldImplementation>> =
		FieldTypes.init();


	private static init() : Map<string,Class<FieldImplementation>>
	{
		let map:Map<string,Class<FieldImplementation>> =
			new Map<string,Class<FieldImplementation>>();

		map.set("input",Input);
		map.set("radio",Radio);
		map.set("select",Select);

		return(map);
	}

	public static get(tag:string, type?:string) : Class<FieldImplementation>
	{
		let impl:Class<FieldImplementation> = FieldTypes.implementations.get(tag.toLowerCase());
		if (impl == null) return(Input);

		if (impl == Input && type?.toLowerCase() == "radio")
			return(Radio);

		return(impl);
	}
}