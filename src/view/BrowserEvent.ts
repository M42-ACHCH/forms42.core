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

import { FormsModule } from "../application/FormsModule.js";

export class BrowserEvent
{
    private event$:any;
	private type$:string;

    private dseq:number = 0;
    private useq:number = 0;
    private repeat$:boolean = false;

    public key:string = null;
    public ctrlkey:string = null;
    public funckey:string = null;

    public mark:boolean = false;
    public undo:boolean = false;
    public copy:boolean = false;
    public paste:boolean = false;
	public focus:boolean = false;
    public accept:boolean = false;
    public cancel:boolean = false;
    public ignore:boolean = false;
    public prevent:boolean = false;
    public modified:boolean = false;
    public mousedown:boolean = false;
    public mouseinit:boolean = false;
    public mousemark:boolean = false;
    public navigation:boolean = false;
    public printable$:boolean = false;

    public alt:boolean = false;
    public ctrl:boolean = false;
    public meta:boolean = false;
    public shift:boolean = false;

	public static ctrmod:string = BrowserEvent.detect();

	private static detect() : string
	{
		let os:string = FormsModule.platform();

		if (os.startsWith("Mac"))
			return("meta");

		return("ctrl");
	}


    public setEvent(event:any) : void
    {
        this.event$ = event;
		this.type$ = event.type;

        if (!this.isKeyEvent) this.reset();
        else                  this.KeyEvent();

        if (this.isMouseEvent) this.mouseEvent();

        if (this.type == "blur") this.focus = false;
        if (this.type == "focus") this.focus = true;
    }


    public get event() : any
    {
        return(this.event$);
    }


    public reset() : void
    {
        this.key = null;
        this.alt = false;
        this.meta = false;
        this.ctrl = false;
        this.mark = false;
        this.undo = false;
        this.copy = false;
        this.paste = false;
        this.shift = false;
		this.accept = false;
		this.cancel = false;
		this.ignore = false;
        this.prevent = false;
        this.modified = false;
        this.mouseinit = false;
        this.navigation = false;
        this.printable$ = false;

        this.ctrlkey = null;
        this.funckey = null;
    }

    public get isMouseEvent() : boolean
    {
        if (this.event.type == "wheel") return(true);
        if (this.event.type.includes("click")) return(true);
        return(this.event.type.startsWith("mouse"));
    }

    public get isKeyEvent() : boolean
    {
        return(this.event.type.startsWith("key") && this.event.key != null);
    }

    public get isPrintableKey() : boolean
    {
        if (this.ctrlkey != null) return(false);
        if (this.funckey != null) return(false);
        return(this.key != null && this.key.length == 1);
    }

    public get onFuncKey() : boolean
    {
        return(this.funckey != null);
    }

    public get onCtrlKeyUp() : boolean
    {
        return(this.ctrlkey != null && this.type == "keyup");
    }

    public get onScrollUp() : boolean
    {
        return(this.type == "wheel" && this.event.deltaY > 0);
    }

    public get onScrollDown() : boolean
    {
        return(this.type == "wheel" && this.event.deltaY < 0);
    }

    public get onCtrlKeyDown() : boolean
    {
        return(this.ctrlkey != null && this.type == "keydown");
    }

    public get type() : string
    {
        return(this.type$);
    }

    public set type(type:string)
    {
        this.type$ = type;
    }

    public get repeat() : boolean
    {
        if (this.key == null)
            return(false);

        if (this.alt || this.ctrl || this.meta)
            return(false);

        return(this.type == "keydown" && this.repeat$);
    }

    public get printable() : boolean
    {
        if (this.repeat && this.isPrintableKey) return(true);
        else return(this.type == "keyup" && this.printable$);
    }

    public get modifier() : boolean
    {
        return(this.alt || this.ctrl || this.meta || this.shift);
    }

    public preventDefault(flag?:boolean) : void
    {
        if (flag == null) flag = this.prevent;
        if (flag) this.event.preventDefault();
    }


    private KeyEvent() : void
    {
        this.undo = false;
        this.mark = false;
        this.copy = false;
        this.paste = false;
		this.accept = false;
		this.cancel = false;
		this.navigation = false;
        this.printable$ = false;

        switch(this.event.type)
        {
            case "keyup" :

                this.useq = this.dseq;

                if (!this.alt && !this.ctrl && !this.meta)
                {
                    if (this.event.key.length == 1)
                    {
                        this.ignore = false;
                        this.printable$ = true;
						this.navigation = false;
                        this.key = this.event.key;
                    }
                }

				if (this.key == "Backspace") this.ignore = false;
                if (this.event.key == "PageUp") this.ignore = false;
                if (this.event.key == "PageDown") this.ignore = false;

                if (this.event.key == "ArrowLeft") this.ignore = false;
                if (this.event.key == "ArrowRight") this.ignore = false;

                if (this.event.key == "Tab") this.navigation = true;

                if (this.event.key == "PageUp") this.navigation = true;
                if (this.event.key == "PageDown") this.navigation = true;

                if (this.event.key == "ArrowUp") this.navigation = true;
                if (this.event.key == "ArrowDown") this.navigation = true;

                if (this.event.key == "Alt") {this.ignore = true; this.alt = false;}
                if (this.event.key == "Meta") {this.ignore = true; this.meta = false;}
                if (this.event.key == "Shift") {this.ignore = true; this.shift = false;}
                if (this.event.key == "Control") {this.ignore = true; this.ctrl = false;}

                if (this.event.key == "Enter") {this.accept = true; this.ignore = false;}
                if (this.event.key == "Escape") {this.cancel = true; this.ignore = false;}

                if (this.ctrlkey != null) this.ignore = false;
                if (this.key != null && this.key.startsWith("F")) this.ignore = false;

            break;

            case "keypress":

                this.ignore = true;
				this.navigation = false;
                this.key = this.event.key;

                if (this.event.key.length == 1)
                    this.printable$ = true;

            break;

            case "keydown":

                this.ignore = true;
                this.prevent = false;
				this.navigation = false;
                this.printable$ = false;

                this.repeat$ = (this.dseq != this.useq && this.event.key == this.key);
                this.dseq = (++this.dseq % 32768);

                this.ctrlkey = null;
                this.funckey = null;

                this.key = this.event.key;

                if (this.key.length == 1 && (this.alt || this.ctrl || this.meta))
                {
                    this.ignore = false;
                    if (this.alt) this.ctrlkey = "ALT-"+this.key;
                    if (this.ctrl) this.ctrlkey = "CTRL-"+this.key;
                    if (this.meta) this.ctrlkey = "META-"+this.key;

                    switch(this.key)
                    {
                        case '+':
                        case '-':
                        case 'a':
                        case 'c':
                        case 'x':
                        case 'v':
                        case 'r':
                        case 'z': break;
                        default : this.prevent = true;
                    }

					let mod:Boolean = false;
					if (BrowserEvent.ctrmod == "ctrl" && this.ctrl) mod = true;
					if (BrowserEvent.ctrmod == "meta" && this.meta) mod = true;

					if (mod && this.key == 'a') this.mark = true;
					if (mod && this.key == 'c') this.copy = true;
					if (mod && this.key == 'z') this.undo = true;
					if (mod && this.key == 'v') this.paste = true;
				}

                if (this.key == "Alt") this.alt = true;
                if (this.key == "Meta") this.meta = true;
                if (this.key == "Shift") this.shift = true;
                if (this.key == "Control") this.ctrl = true;

                if (this.key == "Tab") this.prevent = true;
                if (this.key == "Enter") this.prevent = true;
                if (this.key == "Escape") this.prevent = true;

                if (this.key == "PageUp") this.prevent = true;
                if (this.key == "PageDown") this.prevent = true;

                if (this.key == "ArrowUp") this.prevent = true;
                if (this.key == "ArrowDown") this.prevent = true;

                if (this.key.startsWith("F"))
                {
                    this.prevent = true;
                    this.funckey = this.key;
                }

            break;

            default:
                this.key = null;
                this.ignore = true;
                this.prevent = false;
				this.navigation = false;
                this.printable$ = false;
            break;
        }
    }

    private mouseEvent() : void
    {
		this.reset();

        if (this.type == "mouseup")
        {
            this.mousedown = false;
            setTimeout(() => {this.mousemark = false;},1);
        }

        if (this.type == "mousedown")
        {
            this.mousedown = true;
            this.mousemark = false;
        }

        let first:boolean = !this.mousemark;
        if (this.type == "mousemove" && this.mousedown)
        {
            this.mousemark = true;
            this.mouseinit = first;
        }
    }

    public toString() : string
    {
        return(this.type+" prevent: "+this.prevent+" ignore: "+this.ignore+" printable: "+this.printable+" key: "+this.key+" navigation: "+this.navigation);
    }
}