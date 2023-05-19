// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {main} from '../models';
import {docs} from '../models';
import {helix} from '../models';

export function AuthenticateKVClient(arg1:string):Promise<void>;

export function GetAppVersion():Promise<main.VersionInfo>;

export function GetBackups():Promise<Array<main.BackupInfo>>;

export function GetDocumentation():Promise<{[key: string]: docs.KeyObject}>;

export function GetKilovoltBind():Promise<string>;

export function GetLastLogs():Promise<Array<main.LogEntry>>;

export function GetTwitchAuthURL():Promise<string>;

export function GetTwitchLoggedUser():Promise<helix.User>;

export function IsFatalError():Promise<boolean>;

export function IsServerReady():Promise<boolean>;

export function RestoreBackup(arg1:string):Promise<void>;

export function SendCrashReport(arg1:string,arg2:string):Promise<string>;

export function TestCommandTemplate(arg1:string):Promise<void>;

export function TestTemplate(arg1:string,arg2:any):Promise<void>;
