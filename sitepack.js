var fs = require('fs');
exports.get = function(string,fn){
		var json = fs.readFileSync("lib/sitepack.json");
		var obj = JSON.parse(json);
		var key = "obj."+string;
		var val = eval(key);
		if(!val){
			fn(null);
		}
		else{
			fn(val);
		}
	};
	
exports.getSYNC = function(string){
		var json = fs.readFileSync("lib/sitepack.json");
		var obj = JSON.parse(json);
		var key = "obj."+string;
		var val = eval(key);
		if(!val){
			return null;
		}
		else{
			return val;
		}
	};
	
exports.switchPaystackMode = function (callback){
			fs.readFile("lib/sitepack.json",function(err,data){
				if(err){
					callback({err:1,message:"could not read data"});
				}
				else{
					var obj = JSON.parse(data.toString());
					var state = obj.paystack.mode;
					switch(state){
						case "test":
							if(obj.paystack.live.private_key && obj.paystack.live.private_key != null && obj.paystack.live.private_key != "" && obj.paystack.live.public_key && obj.paystack.live.public_key != "" && obj.paystack.live.public_key != null){
								obj.paystack.mode = "live";
							}
						break;
						case "live":
							obj.paystack.mode = "test";
						break;
						default:
							obj.paystack.mode = "test";
					}
					var obj_str = JSON.stringify(obj);
					fs.writeFile('lib/sitepack.json',obj_str, function(err){
						if(err){
							callback({err:1,message:"Could not save data"});
						}
						else{
							callback({succ:1,message:"Operation Successful!"});
						}
					});
				}
			});
		}
		
exports.setPaystackKey = function (key,type,callback){
			if(!key || key == null || key == ""){
				callback({err:1,message:"key is null or invalid"});
			}
			else{
				fs.readFile("lib/sitepack.json",function(err,data){
					if(err){
						callback({err:1,message:"could not read data"});
					}
					else{
						var obj = JSON.parse(data.toString());
						switch(type){
							case "testPublic":
								obj.paystack.test.public_key = key;
							break;
							case "testPrivate":
								obj.paystack.test.private_key = key;
							break;
							case "livePublic":
								obj.paystack.live.public_key = key;
							break;
							case "livePrivate":
								obj.paystack.live.private_key = key;
							break;
							default:
								callback({err:1,message:"Type of key is not set"});
						}
						var obj_str = JSON.stringify(obj);
						fs.writeFile('lib/sitepack.json',obj_str, function(err){
							if(err){
								callback({err:1,message:"Could not save data"});
							}
							else{
								callback({succ:1,message:"Operation Successful!"});
							}
						});
					}
				});
			}
		}
		
exports.setSMTP = function(key,value,callback){
			fs.readFile("lib/sitepack.json",function(err,data){
				if(err){
					callback({err:1,message:"could not read data"});
				}
				else{
					var obj = JSON.parse(data.toString());
					if(obj.smtp){
						if(!value || value == null || value == ""){
							callback({err:1,message:"Value to be set is invalid"});
						}
						else{
							obj.smtp[key] = value;
							var obj_str = JSON.stringify(obj);
							fs.writeFile('lib/sitepack.json',obj_str, function(err){
								if(err){
									callback({err:1,message:"Could not save data"});
								}
								else{
									callback({succ:1,message:"Operation Successful!"});
								}
							});
						}
					}
					else{
						callback({err:1,message:"key not found!"});
					}
				}
			});
		}