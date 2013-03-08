module Chat{
    /// <reference path="connection.ts"/>
    //ログオブジェクト
    export interface LogObj {
        _id:string; //発言のid
        name:string;    //発言者名
        time:string;    //ISODate
        ip:string;
        channel:any;    //文字列か配列
        comment:string; //コメント（文字列化された）
        syslog?:bool;
        commentObject?:any; //文字列表現でないコメントがある場合
        ipff?:string;   //Forwarded forの場合のもとIP
    }
    //ユーザーオブジェクト
    export interface UserObj {
        id:number;  //Id
        name:string;
        ip:string;
        rom:bool;
        ua:string;
    }
    //サーバーへ送る用だ!
    //入退室通知オブジェクト
    export interface InoutNotify{
        name:string;
    }
    //発言通知オブジェクト
    export interface CommentNotify{
        comment:string;
        response:string;    //log id
        channel:string[];
    }

    //-----------------
    //ユーザーの情報を保存するぞ!
    export class ChatUserData{
        //lastid: 最後のsessionid
        public lastid:string;
        public name:string;    //ユーザー名
        public gyoza:number;    //Gyazo設定(0～2)
        public volume:number;   //ボリューム(0～100)
        public channelMode:number;  //チャネル開き方設定(0～1)
        public dischannel:string[]; //dischannel対象一覧
        //読み込み
        load():void{
            this.lastid = localStorage.getItem("lastid") || null;
            this.name = localStorage.getItem("socketchat_name") || null;
            this.gyoza= Number(localStorage.getItem("gyoza")) || 0;
            this.volume=Number(localStorage.getItem("volume"))|| 50;
            this.channelMode= Number(localStorage.getItem("channelMode")) || 0;
            //dischannel
            var disc=localStorage.getItem("dischannel");
            this.dischannel = disc ? JSON.parse(disc) : [];
        }
        //保存
        save():void{
            if("string"===typeof this.lastid)localStorage.setItem("lastid",this.lastid);
            if("string"===typeof this.name)localStorage.setItem("socketchat_name",this.name);
            localStorage.setItem("gyoza",String(this.gyoza));
            localStorage.setItem("volume",String(this.volume));
            localStorage.setItem("channelMode",String(this.channelMode));
            localStorage.setItem("dischannel",JSON.stringify(this.dischannel));
        }

    }
    // サーバーから情報を受け取るぞ!
    export class ChatReceiver{
        private oldest_time:Date=null;    // 保有している最も古いログ
        private event:EventEmitter; //内部使用
        constructor(private connection:ChatConnection){
            this.event=getEventEmitter();
        }
        //イベント操作用
        on(event:string,listener:(...args:any[])=>any):void{
            this.event.on(event,listener);
        }
        once(event:string,listener:(...args:any[])=>any):void{
            this.event.once(event,listener);
        }
        removeListener(event:string,listener:(...args:any[])=>any){
            this.event.removeListener(event,listener);
        }
        removeAllListeners(event?:string){
            this.event.removeAllListeners(event);
        }

        //通信初期化
        init():void{
            // ログ初期化
            var c:ChatConnection=this.connection;
            c.on("init",this.loginit.bind(this));
            c.on("log",this.log.bind(this));
            c.on("users",this.userinit.bind(this));
            c.on("userinfo",this.userinfo.bind(this));
            c.on("newuser",this.newuser.bind(this));
            c.on("deluser",this.deluser.bind(this));
            c.on("inout",this.inout.bind(this));
        }
        //最初のログを送ってきた
        loginit(data:{logs:LogObj[];}):void{
            //一番古いログをとる
            if(data.logs){
                this.oldest_time=new Date(data.logs[data.logs.length-1].time);
            }
            this.event.emit("loginit",data.logs);
        }
        //ログを送ってきた
        log(data:LogObj):void{
            this.event.emit("log",data);
        }
        //ユーザー一覧だ
        userinit(data:{users:UserObj[];roms:number;active:number;}):void{
            this.event.emit("userinit",data);
        }
        //自分の情報を教えてもらう
        userinfo(data:{name:string;rom:bool;}):void{
            this.event.emit("userinfo",data);
        }
        //誰かきた
        newuser(data:UserObj):void{
            this.event.emit("newuser",data);
        }
        //いなくなった
        deluser(userid:string):void{
            this.event.emit("deluser",userid);
        }
        //入退室した
        inout(data:UserObj):void{
            this.event.emit("inout",data);
        }
    }
    //チャットの動作管理をするぞ！
    export class ChatProcess{
        //コネクション
        constructor(private connection:ChatConnection,private receiver:ChatReceiver,private userData:ChatUserData){
        }
        //入退室する
        inout(data:InoutNotify){
            //サーバーに送る
            this.connection.send("inout",data);
        }
        //コメントする
        comment(data:CommentNotify){
            //チャネル処理とか入れたいけど・・・？
            this.connection.send("say",data);
        }
    }
}
