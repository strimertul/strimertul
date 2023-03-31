export namespace helix {
	
	export class User {
	    id: string;
	    login: string;
	    display_name: string;
	    type: string;
	    broadcaster_type: string;
	    description: string;
	    profile_image_url: string;
	    offline_image_url: string;
	    view_count: number;
	    email: string;
	    // Go type: Time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.login = source["login"];
	        this.display_name = source["display_name"];
	        this.type = source["type"];
	        this.broadcaster_type = source["broadcaster_type"];
	        this.description = source["description"];
	        this.profile_image_url = source["profile_image_url"];
	        this.offline_image_url = source["offline_image_url"];
	        this.view_count = source["view_count"];
	        this.email = source["email"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class LogEntry {
	    caller: string;
	    time: string;
	    level: string;
	    message: string;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.caller = source["caller"];
	        this.time = source["time"];
	        this.level = source["level"];
	        this.message = source["message"];
	        this.data = source["data"];
	    }
	}
	export class VersionInfo {
	    release: string;
	    // Go type: debug
	    build?: any;
	
	    static createFrom(source: any = {}) {
	        return new VersionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.release = source["release"];
	        this.build = this.convertValues(source["build"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

