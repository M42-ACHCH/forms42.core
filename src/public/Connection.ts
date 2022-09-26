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

import { Connections } from "./Connections.js";

export class Connection
{
	private base$:URL = null;
	private usr$:string = null;
	private pwd$:string = null;
	private headers$:any = {};
	private name$:string = null;
	private method$:string = null;
	private success$:boolean = true;

	public constructor(name:string, url?:string|URL)
	{
		this.name$ = name;

		let host:string = window.location.host;
		let prot:string = window.location.protocol;

		if (url == null)
			url = prot+'//'+host;

		if (typeof url === "string")
			url = new URL(url);

		this.base$ = url;
		Connections.register(this);
	}

	public get name() : string
	{
		return(this.name$);
	}

	public get baseURL() : URL
	{
		return(this.base$);
	}

	public get username() : string
	{
		return(this.usr$);
	}

	public set username(username:string)
	{
		this.usr$ = username;
	}

	public get password() : string
	{
		return(this.pwd$);
	}

	public set password(password:string)
	{
		this.pwd$ = password;
	}

	public get success() : boolean
	{
		return(this.success$);
	}

	public get headers() : any
	{
		return(this.headers$);
	}

	public set headers(headers:any)
	{
		this.headers$ = headers;
	}

	public set baseURL(url:string|URL)
	{
		if (typeof url === "string")
			url = new URL(url);

		this.base$ = url;
	}

	public async get(url?:string|URL, raw?:boolean) : Promise<any>
	{
		this.method$ = "GET";
		return(this.invoke(url,null,raw));
	}

	public async post(url?:string|URL, payload?:string|any, raw?:boolean) : Promise<any>
	{
		this.method$ = "POST";
		return(this.invoke(url,payload,raw));
	}

	public async patch(url?:string|URL, payload?:string|any, raw?:boolean) : Promise<any>
	{
		this.method$ = "PATCH";
		return(this.invoke(url,payload,raw));
	}

	private async invoke(url:string|URL, payload:string|any, raw:boolean) : Promise<any>
	{
		let body:any = null;
		this.success$ = true;

		let endpoint:URL = new URL(this.base$);
		if (url) endpoint = new URL(url,endpoint);

		if (payload)
		{
			if (typeof payload != "string")
				payload = JSON.stringify(payload);
		}

		let http:any = await fetch(endpoint,
		{
			method 	: this.method$,
			headers 	: this.headers$,
			body 		: payload
		}).
		catch((errmsg) =>
		{
			if (raw) body = errmsg;
			else body =
			{
				success: false,
				message: errmsg
			};

			this.success$ = false;
		});

		if (this.success$)
		{
			if (raw) body = await http.text();
			else		body = await http.json();
		}

		return(body);
	}
}