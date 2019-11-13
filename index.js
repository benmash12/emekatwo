var express = require("express");
var nodemailer = require('nodemailer');
var bodyParser = require('body-parser');
var mysql = require('mysql'); 
var request = require('request');
var siofu  = require('socketio-file-upload');
var crypto = require('crypto');
var fs = require('fs');
var credentials = require('./credentials.js');
var sitepack = require('./sitepack.js');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
app.use(siofu.router);
var con = mysql.createPool({
  host: "",
  user: "",
  password: "",
  database: "",
  multipleStatements:true
});
con.on('error', function() {});

io.on("connection", function (socket){
	//console.log("socket connected on with id: " +socket.id);
	var uploader = new siofu();
	uploader.dir = "public/uploads";
	uploader.maxFileSize = 1024 * 1000 * 1000 * 2;
	uploader.listen(socket);
	uploader.on("start", function(event){
		if (/\.exe$/.test(event.file.name)) {
			uploader.abort(event.file.id, socket);
		}
		var verif = /[jpg|png|gif]$/;
		if (!verif.test(event.file.name)) {
			uploader.abort(event.file.id, socket);
		}
	});
	uploader.on("error", function(event){
		//console.log("Error from uploader", event);
	});
	uploader.on("saved", function(event){
		//console.log(event.file);
	});
	socket.on("add_new_category", function (data,fn){
		var category = data.category;
		var sock = this;
		con.query("SELECT * FROM categories WHERE category="+con.escape(category)+"", function (err,result){
			if(err){
				fn("Error... Category not saved!");
			}
			else{
				if(result.length > 0){
					fn("category already exists");
				}
				else{
					con.query("INSERT INTO categories(category) VALUES("+con.escape(category)+")", function (err,result){
						if(err){
							fn("Error... Category not saved!");
						}
						else{
							fn(category + " Added to categories");
							refresh_admin(sock);
						}
					});
				}
			}
		});
	});
	socket.on("admin_change_password", function (data,fn){
		var old = crypto.createHmac('sha256', data.old).update(credentials.passwordCrypt).digest('hex');
		var newp = crypto.createHmac('sha256', data.new).update(credentials.passwordCrypt).digest('hex');
		var id = this.id;
		con.query("SELECT * FROM admin WHERE password="+con.escape(old)+" AND active_status="+con.escape(id)+"", function (err,result){
			if(err){
				fn("Server Error, Please try again!");
			}
			else{
				if(result.length < 1){
					fn("Old Password does not match");
				}
				else{
					con.query("UPDATE admin SET password="+con.escape(newp)+"", function (err,result){
						if(err){
							fn("Server Error, Please try again!");
						}
						else{
							fn("Password Changed Successfully!");
						}
					});
				}
			}
		});
	});
	socket.on("add_new_subcategory", function (data,fn){
		var category = data.category;
		var subcategory = data.subcategory;
		var sock = this;
		con.query("SELECT * FROM subcategories WHERE category="+con.escape(category)+" AND subcategory="+con.escape(subcategory)+"", function (err,result){
			if(err){
				fn("Error... Subategory not saved!");
			}
			else{
				if(result.length > 0){
					fn("subcategory already exists");
				}
				else{
					con.query("INSERT INTO subcategories(category,subcategory) VALUES("+con.escape(category)+","+con.escape(subcategory)+")", function (err,result){
						if(err){
							fn("Error... Subategory not saved!");
						}
						else{
							fn(subcategory + " Added to subcategories");
							refresh_admin(sock);
						}
					});
				}
			}
		});
	});
	socket.on("load_admin", function (data){
		var sock = this;
		refresh_admin(sock);
		var id = this.id;
		con.query("UPDATE admin SET active_status='"+id+"'", function(err,data){
		});
	});
	socket.on("delete_advert_pre", function(data){
		fs.unlink("public/uploads/"+data, function (){
		});
	});
	socket.on("admin_add_advert", function (data,fn){
		var sock = this;
		con.query("INSERT INTO ads(picture,link) VALUES("+con.escape(data.picture)+","+con.escape(data.link)+")", function (err,result){
			if(err){
				fn("SERVER ERROR... operation failed");
				fs.unlink("public/uploads/"+data.picture, function (){
				});
			}
			else{
				fn("New Advert Uploaded Successfully!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("delete_advert", function (data,fn){
		var id = data.id;
		var sock = this;
		var picture = data.picture;
		con.query("DELETE FROM ads WHERE id="+con.escape(id)+"", function (err,result){
			if(err){
				fn("Deletion failed!");
			}
			else{
				fn("Deletion Successful!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("delete_category", function (data,fn){
		var sock = this;
		con.query("DELETE  FROM categories WHERE id='"+data.id+"'", function (err,data){
			if(err){
				fn("hsgsg");
			}
			else{
				fn({succ:1});
				con.query("DELETE FROM subcategories WHERE category="+con.escape(data.cat)+"", function (err,result){});
				refresh_admin(sock);
			}
		});
	});
	socket.on("delete_subcategory", function (data,fn){
		var sock = this;
		con.query("DELETE  FROM subcategories WHERE id='"+data+"'", function (err,result){
			if(err){
				fn("hsgsg");
			}
			else{
				fn({succ:1});
				refresh_admin(sock);
			}
		});
	});
	socket.on("add_promo_code", function (data,fn){
		var sock = this;
		con.query("INSERT INTO promo_code(code,percentage) VALUES("+con.escape(data.code)+","+con.escape(data.percentage)+")",function(err,result){
			if(err){
				fn("Error... please try again");
			}
			else{
				fn("promo code added successfully!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("delete_promo_code", function (data,fn){
		var sock = this;
		con.query("DELETE FROM promo_code WHERE id="+con.escape(data)+"", function (err,result){
			if(err){
				fn("Error deleting promo code");
			}
			else{
				fn("Deletion Successful!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("paystack_mode", function(fn){
		var sock = this;
		sitepack.switchPaystackMode(function (data){
			if(data.succ){
				refresh_admin(sock);
			}
			fn(data.message);
		});
	});
	socket.on("paystack_view_keys",function(fn){
		var lpu = "";
		var lpr = "";
		var tpu = "";
		var tpr = "";
		sitepack.get("paystack.live.public_key",function(data){
			if(data != null){
				var lpu = data;
			}
			sitepack.get("paystack.live.private_key",function(data){
				if(data != null){
					var lpr = data;
				}
				sitepack.get("paystack.test.public_key",function(data){
					if(data != null){
						var tpu = data;
					}
					sitepack.get("paystack.test.private_key",function(data){
						if(data != null){
							var tpr = data;
						}
						fn({succ:1,lpu:lpu,lpr:lpr,tpu:tpu,tpr:tpr});
					});
				});
			});
		});
	});
	socket.on("smtp_set", function (data,fn){
		var key = data.key;
		var value = data.value;
		sitepack.setSMTP(key,value,function(data){
			fn(data.message);
		});
	});
	socket.on("paystack_set_keys", function (data,fn){
		var key = data.key;
		var value = data.value;
		switch(key){
			case 'lpu':
				sitepack.setPaystackKey(value,"livePublic",function(data){
					fn(data.message);
				});
			break;
			case 'lpr':
				sitepack.setPaystackKey(value,"livePrivate",function(data){
					fn(data.message);
				});
			break;
			case 'tpu':
				sitepack.setPaystackKey(value,"testPublic",function(data){
					fn(data.message);
				});
			break;
			case 'tpr':
				sitepack.setPaystackKey(value,"testPrivate",function(data){
					fn(data.message);
				});
			break;
			default:
				fn("Invalid Key!");
		}
	});
	socket.on("remove_top",function(data,fn){
		var sock = this;
		con.query("UPDATE products SET top='no' WHERE id="+con.escape(data)+"",function(err,result){
			if(err){
				fn("server error");
			}
			else{
				fn("Operation successful!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("update_product_stock", function (data,fn){
		var sock = this;
		con.query("UPDATE products SET stock="+con.escape(data.value)+" WHERE id="+con.escape(data.id)+"", function (err,result){
			if(err){
				fn("database error!");
			}
			else{
				fn({succ:1});
				refresh_admin(sock);
			}
		});
	});
	socket.on("update_product_price", function (data,fn){
		var sock = this;
		con.query("UPDATE products SET price="+con.escape(data.value)+" WHERE id="+con.escape(data.id)+"", function (err,result){
			if(err){
				fn("database error!");
			}
			else{
				fn({succ:1});
				refresh_admin(sock);
			}
		});
	});
	socket.on("update_product_discount", function (data,fn){
		var sock = this;
		con.query("UPDATE products SET discount="+con.escape(data.value)+" WHERE id="+con.escape(data.id)+"", function (err,result){
			if(err){
				fn("database error!");
			}
			else{
				fn({succ:1});
				refresh_admin(sock);
			}
		});
	});
	socket.on("upload_new_product", function (data,fn){
		var cat = data.category;
		var sock = this;
		var subcat = data.subcategory;
		var title = data.title;
		var picture = data.picture;
		var price = Number(data.price);
		var discount = Number(data.discount);
		var description = data.description;
		var specs = data.specifications;
		var stock = data.stock;
		var sql = "INSERT INTO products(title,price,discount,description,picture,specifications,rating,status,category,subcategory,stock)"+
		" VALUES("+con.escape(title)+","+con.escape(price)+","+con.escape(discount)+","+con.escape(description)+","+con.escape(picture)+","+con.escape(specs)+",'0','active',"+con.escape(cat)+","+con.escape(subcat)+","+con.escape(stock)+")";
		con.query(sql, function (err,result){
			if(err){
				fn("SERVER ERROR : product upload failed");
			}
			else{
				fn("product uploaded successfully!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("update_delivery_span",function(data,fn){
		var sock = this;
		var id = data.id;
		var del = data.del;
		con.query("UPDATE states SET delivery_days="+con.escape(del)+" WHERE id="+con.escape(id)+"",function(err,result){
			if(err){
				fn("Operation failed!");
			}
			else{
				fn("Operation successful!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("update_order_status",function(data,fn){
		if(data.value && data.id){
			var sock = this;
			con.query("UPDATE orders SET status="+con.escape(data.value)+" WHERE id="+con.escape(data.id)+"",function(err,result){
				if(err){
					fn("ERROR: server error");
				}
				else{
					fn("SUCCESS: operation successful");
					refresh_admin(sock);
				}
			});
		}
		else{
			fn("ERROR: parameters not supplied");
		}
	});
	socket.on("update_order_location",function(data,fn){
		if(data.value && data.id){
			var sock = this;
			var dtt = new Date();
			var ddd = dtt.getDate() + "/" + dtt.getMonth() + "/" + dtt.getFullYear() + " at " + dtt.getHours() + ":" + dtt.getMinutes();
			con.query("UPDATE orders SET location="+con.escape(data.value)+",locationUpdate="+con.escape(ddd)+" WHERE id="+con.escape(data.id)+"",function(err,result){
				if(err){
					fn("ERROR: server error");
				}
				else{
					fn("SUCCESS: operation successful");
					refresh_admin(sock);
				}
			});
		}
		else{
			fn("ERROR: parameters not supplied");
		}
	});
	socket.on("update_order_payment",function(data,fn){
		if(data.value && data.id){
			var sock = this;
			con.query("UPDATE orders SET payment="+con.escape(data.value)+" WHERE id="+con.escape(data.id)+"",function(err,result){
				if(err){
					fn("ERROR: server error");
				}
				else{
					fn("SUCCESS: operation successful");
					refresh_admin(sock);
				}
			});
		}
		else{
			fn("ERROR: parameters not supplied");
		}
	});
	socket.on("update_delivery_charge",function(data,fn){
		var sock = this;
		var id = data.id;
		var del = data.del;
		con.query("UPDATE states SET fee="+con.escape(del)+" WHERE id="+con.escape(id)+"",function(err,result){
			if(err){
				fn("Operation failed!");
			}
			else{
				fn("Operation successful!");
				refresh_admin(sock);
			}
		});
	});
	socket.on("delete_product_ii", function (data,fn){
		var sock = this;
		if(data != ""){
			con.query("DELETE FROM products WHERE id='"+data+"'",function(err,result){
				if(err){
					fn("Deletion not successful!");
				}
				else{
					fn("Deletion Successful");
					refresh_admin(sock);
				}
			});
		}
		else{
			fn("Product not found");
		}
	});
	socket.on("update_state", function (id,fn){
		var sock = this;
		con.query("SELECT * FROM states WHERE id="+con.escape(id)+"",function(err,result){
			if(err){
				fn("server error!");
			}
			else{
				if(result.length !== 1){
					fn("state not found!");
				}
				else{
					if(result[0].allow == "no"){
						con.query("UPDATE states SET allow='yes' WHERE id="+con.escape(id)+"",function(err,result){
							if(err){
								fn("database error");
							}
							else{
								fn("Operation Successful");
								refresh_admin(sock);
							}
						});
					}
					else if(result[0].allow == "yes"){
						con.query("UPDATE states SET allow='no' WHERE id="+con.escape(id)+"",function(err,result){
							if(err){
								fn("database error");
							}
							else{
								fn("Operation Successful");
								refresh_admin(sock);
							}
						});
					}
					else{
						fn("database error!");
					}
				}
			}
		});
	});
	socket.on("add_to_top", function (data,fn){
		var sock = this;
		con.query("SELECT* FROM products WHERE top='yes'",function(err,result){
			if(err){
				fn("server error");
			}
			else{
				if(result.length < 50){
					con.query("UPDATE products SET top='yes' WHERE id="+con.escape(data)+"",function(err,result){
						if(err){
							fn("server error");
						}
						else{
							fn({succ:1});
							refresh_admin(sock);
						}
					});
				}
				else{
					fn("Only 50 items can be added to the list of Top items");
				}
			}
		});
	});
	socket.on("load_user",function(data){
		var sock = this;
		var username = data.username;
		con.query("UPDATE users SET active_status="+con.escape(sock.id)+" WHERE username="+con.escape(username)+"",function(err,result){
			if(!err){
				refresh_user(sock,username);
			}
		});
	});
	socket.on("cancel_order_user",function(data,fn){
		var sock = this;
		var username = data.username;
		con.query("UPDATE orders SET status='cancelled' WHERE id="+con.escape(data.id)+"",function(err,result){
			if(!err){
				refresh_user(sock,username);
				fn("Your order has been cancelled successfully");
				io.emit("order_cancel");
			}
			else{
				fn("Order cancellation not successful");
			}
		});
	});
	socket.on("track_order",function(data,fn){
		con.query("SELECT id,location,locationUpdate FROM orders WHERE tracking_id="+con.escape(data)+"",function(err,result){
			if(err){
				fn("SERVER ERROR... please try again");
			}
			else{
				if(result.length !== 1){
					fn("ERROR: order not found");
				}
				else{
					if(result[0].location && result[0].location !== ""){
						fn("The last updated location of the order with the tracking id '"+data+"' is:"+result[0].location +".<br>Updated on"+result[0].locationUpdate);
					}
					else{
						fn("The location of your order has not been updated yet. might be because your delivery is yet to commence, please try again later");
					}
				}
			}
		});
	});
	socket.on("send_message_user",function(message){
		var sock = this;
		if(message != "" || message.replace(/[\n|\s]/g,"") != ""){
			con.query("SELECT username FROM users WHERE active_status="+con.escape(sock.id)+"",function(err,result){
				if(!err){
					if(result.length == 1){
						var username =result[0].username;
						var sql = "INSERT INTO support(user,type,content,status,registered) "+
						"VALUES("+con.escape(username)+",'receive',"+con.escape(message)+",'unseen','yes')";
						con.query(sql,function(err,result){
							if(!err){
								refresh_user(sock,username);
								io.emit("admin_new_support",{newM:1});
							}
						});
					}
				}
			});
		}
	});
	socket.on("send_message_admin",function(data){
	//	if(data.user && data.user !== "" && data.message){
			var sock = this;
			var username = data.user;
			var message = data.message;
			var sql = "INSERT INTO support(user,type,content,status,registered) "+
			"VALUES("+con.escape(username)+",'send',"+con.escape(message)+",'unseen','yes')";
			con.query(sql,function(err,result){
				if(!err){
					refresh_admin(sock);
					con.query("SELECT * FROM users WHERE username="+con.escape(username)+"", function(err,result){
						if(!err && result.length == 1){
							var stats = result[0].active_status;
							if(stats !== "offline"){
								var id = stats;
								io.to(id).emit("user_new_support",{newM:1});
							}
						}
					});
				}
			});
	//	}
	});
	socket.on("user_read",function(username){
		var sock = this;
		con.query("UPDATE support SET status='seen' WHERE user="+con.escape(username)+" AND type='send'",function(err,result){
			if(!err){
				refresh_user(sock,username);
			}
		});
	});
	socket.on("admin_seen",function(username){
		var sock = this;
		con.query("UPDATE support SET status='seen' WHERE user="+con.escape(username)+" AND type='receive'",function(err,result){
			if(!err){
				refresh_admin(sock);
			}
		});
	});
	socket.on("user_stats",function(username,fn){
		con.query("SELECT * FROM users  WHERE username="+con.escape(username)+"",function(err,result){
			if(err){
				fn("offline");
			}
			else{
				var stats = result[0].active_status;
				if(stats == "offline"){
					fn("offline");
				}
				else{
					fn("online");
				}
			}
		});
	});
	socket.on("user_change_password", function (data,fn){
		var old = crypto.createHmac('sha256', data.old).update(credentials.passwordCrypt).digest('hex');
		var newp = crypto.createHmac('sha256', data.new).update(credentials.passwordCrypt).digest('hex');
		var username = data.user;
		var id = this.id;
		con.query("SELECT * FROM users WHERE username="+con.escape(username)+" AND password="+con.escape(old)+" AND active_status="+con.escape(id)+"", function (err,result){
			if(err){
				fn("Server Error, Please try again!");
			}
			else{
				if(result.length !== 1){
					fn("Old Password does not match");
				}
				else{
					con.query("UPDATE users SET password="+con.escape(newp)+" WHERE username="+con.escape(username)+" AND active_status="+con.escape(id)+"", function (err,result){
						if(err){
							fn("Server Error, Please try again!");
						}
						else{
							fn("Password Changed Successfully!");
						}
					});
				}
			}
		});
	});
	socket.on("user_newsletter_check",function(data,fn){
		var id = this.id;
		con.query("SELECT * FROM users WHERE active_status="+con.escape(id)+"",function(err,result){
			if(err){
				fn({err:1,message:'Server Error!'});
			}
			else{
				if(result.length !== 1){
					fn({err:1,message:'Session expired'});
				}
				else{
					var news = result[0].newsletter;
					fn({succ:1,message:news});
				}
			}
		});
	});
	socket.on("news_subs",function(data,fn){
		var id = this.id;
		con.query("SELECT * FROM users WHERE active_status="+con.escape(id)+"",function(err,result){
			if(err){
				fn('Server Error!');
			}
			else{
				if(result.length !== 1){
					fn('Session expired');
				}
				else{
					var username = result[0].username;
					con.query("UPDATE users SET newsletter="+con.escape(data)+" WHERE username="+con.escape(username)+"",function(err,result){
						if(err){
							fn('Server Error!');
						}
						else{
							fn('Operation Successful!');
						}
					});
				}
			}
		});
	});
	socket.on("send_news_admin",function(data,fn){
		var receipt = data.receipt;
		var title = data.title;
		var body = data.body;
		var txt = data.txt;
		var href = data.href;
		var big = {subject:title,to:receipt,body:body,btn_href:href,btn_text:txt};
		send_mail(big,function(data){
			if(data.err){
				fn("ERROR: "+data.message);
			}
			else if(data.succ){
				fn("SUCCESS: "+data.message);
			}
			else{
				fn("An unknown error has occurred");
			}
		});
	});
	socket.on("disconnect", function(){
		//console.log("socket disconnected");
		var id = this.id;
		con.query("UPDATE admin SET active_status='offline' WHERE active_status='"+id+"';UPDATE users SET active_status='offline' WHERE active_status='"+id+"';", function(err,result){
			
		});
	});
});


var handlebars = require('express-handlebars')
		.create({
			 defaultLayout:'main', 
			 helpers: {
			 	section: function(name, options){
			 		 if(!this._sections) this._sections = {}; 
			 		 this._sections[name] = options.fn(this); 
			 		 return null; 
			 	},
			 	is: function(a, b, opts){
			 		if (a == b) {
			 			return opts.fn(this)
			 		} else {
			 			return opts.inverse(this)
			 		}
			 	},
			 	isnot: function(a, b, opts) {
			 		if (a != b) {
			 			return opts.fn(this)
			 		} else {
			 			return opts.inverse(this)
			 		}
			 	},
			 	pricing: function(price, discount,opts){
			 		var nprice = Math.ceil(Number(price) - ((Number(discount) / 100) * Number(price)));
			 		return nprice.toString();
			 	},
			 	specs: function(spec,opts){
			 		return spec.replace(/[;|\n]/g,"<br>");
			 	}
			 } 
		});
		
app.engine('handlebars', handlebars.engine); 
app.set('view engine', 'handlebars');
app.set('port',process.env.PORT || 3000);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('cookie-parser')(credentials.cookieSecret));
var session = require('express-session');
app.use(session({
    secret: credentials.passwordCrypt,
    resave: true,
    saveUninitialized: true,
    cookie: {
    	secure: false,
    	maxAge: 86400000
    }
}));

app.use(express.static(__dirname + '/public'));

app.use(require('csurf')()); 
app.use(function(req, res, next){
 res.locals._csrfToken = req.csrfToken(); 
 next(); 
});

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  next()
})






app.get("/", function (req,res){
	var ads = JSON.stringify([]);
	var categories = [];
	var categories_str = JSON.stringify([]);
	var subcategories = [];
	var subcategories_str = JSON.stringify([]);
	var products_latest = JSON.stringify([]);
	var products_dis = [];
	var products_top = [];
	var dat = new Date();
	var dd = dat.getDate().toString();
	var mm = dat.getMonth().toString();
	var yyyy = dat.getFullYear().toString();
	var ip = req.ip;
	var ip = ip.toString();
	var ddd = dd + "." + mm + "." + yyyy + ':' + ip;
	var cook = req.cookies.visit;
	con.query("SELECT * FROM ads ORDER BY id DESC",function(err,result){
		if(!err){
			var ads = JSON.stringify(result);
		}
		con.query("SELECT * FROM categories ORDER BY category ASC",function(err,result){
			if(!err){
				var categories_str = JSON.stringify(result);
				var categories = result;
			}
			con.query("SELECT * FROM subcategories ORDER BY subcategory ASC",function(err,result){
				if(!err){
					var subcategories_str = JSON.stringify(result);
					var subcategories = result;
				}
				con.query("SELECT * FROM products WHERE NOT stock='0' ORDER BY id DESC",function(err,result){
					if(!err){
						var products_latest = JSON.stringify(result);
					}
					con.query("SELECT * FROM products WHERE NOT stock='0' ORDER BY discount DESC LIMIT 75",function(err,result){
						if(!err){
							var products_dis = result;
						}
						con.query("SELECT * FROM products WHERE top='yes' AND NOT stock='0'",function(err,result){
							if(!err){
								var products_top = result;
							}
							if(req.cookies.recent){
								var recent = JSON.parse(req.cookies.recent);
								var recentFinal = recent.reverse();
							}
							else{
								var recentFinal = [];
							}
							con.query("SELECT * FROM visits WHERE dd='"+dd+"' AND mm='"+mm+"' AND yyyy='"+yyyy+"' AND ip='"+ip+"'",function(err,result){
								if(!err && result.length == 0 && cook != ddd){
									con.query("INSERT INTO visits(dd,mm,yyyy,ip) VALUES('"+dd+"','"+mm+"','"+yyyy+"','"+ip+"')",function(err,result){
										res.cookie("visit",ddd);
										cartNumberAsync(req,function(cart){
											res.render("home",{cn:cart,recent:recentFinal,top:products_top,ads:ads,categories:categories,categories_str:categories_str,subcategories:subcategories,subcategories_str:subcategories_str,products_latest:products_latest,products_dis:products_dis});
										});
									});
								}
								else{
									cartNumberAsync(req,function(cart){
										res.render("home",{cn:cart,recent:recentFinal,top:products_top,ads:ads,categories:categories,categories_str:categories_str,subcategories:subcategories,subcategories_str:subcategories_str,products_latest:products_latest,products_dis:products_dis});
									});
								}
							});
						});
					});
				});
			});
		});
	});
});

app.get("/privacy_policy", function(req,res){
	cartNumberAsync(req,function(cart){
		res.render("privacy",{layout:'plain',cn:cart,title:'Privacy Policy'});
	});
});

app.get("/terms", function(req,res){
	cartNumberAsync(req,function(cart){
		res.render("terms",{layout:'plain',cn:cart,title:'Terms of Use'});
	});
});

app.get("/admin", function (req,res){
	if(req.session.admin && req.session.admin != null && req.session.admin != ""){
		res.render("admin",{layout:'admin'});
	}
	else{
		cartNumberAsync(req,function(cart){
			res.render("admin_login",{layout:'plain',cn:cart,title:'Admin Login'});
		});
	}
});

app.get("/sitemap",function(req,res){
	var sql = "SELECT * FROM categories ORDER BY category ASC;SELECT * FROM subcategories ORDER BY subcategory ASC;SELECT * FROM products ORDER BY id DESC";
	con.query(sql,function(err,result){
		if(err){
			res.send("Problem parsing sitemap");
		}
		else{
			res.render("sitemap",{layout:"sitemapLayout",categories:result[0],subcategories:result[1],products:result[2]});
		}
	});
});

app.get("/cart/remove/:id",function(req,res){
	var id = req.params.id;
	if(req.session.username && req.session.username != null && req.session.username != ""){
		con.query("SELECT * FROM users WHERE username="+con.escape(req.session.username)+"", function(err,result){
			if(err){
				res.send("");
			}
			else{
				if(result.length !== 1){
					res.send("");
				}
				else{
					var user = result[0];
					var cart = user.cart;
					if(cart == null || cart == "" || cart == "[]" || cart == '"[]"'){
						res.send("");
					}
					else{
						var cart = JSON.parse(cart);
						for(i=0;i<cart.length;i++){
							if(cart[i].id == id){
								cart.splice(i,1);
							}
						}
						var cart = JSON.stringify(cart);
						con.query("UPDATE users SET cart='"+cart+"' WHERE username="+con.escape(req.session.username)+"",function(err,result){
							if(err){
								res.send("");
							}
							else{
								res.send({succ:1});
							}
						});
					}
				}
			}
		});
	}
	else{
		if(!req.cookies.cart){
			res.send("");
		}
		else{
			var cart = JSON.parse(req.cookies.cart);
			for(i=0;i<cart.length;i++){
				if(cart[i].id == id){
					cart.splice(i,1);
				}
			}
			res.clearCookie("cart");
			var cart = JSON.stringify(cart);
			res.cookie("cart",cart);
			res.send({succ:1});
		}
	}
});

app.get("/checkout/get_user_status",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		var username = req.session.username;
		con.query("SELECT id,username,email FROM users WHERE username="+con.escape(username)+"",function(err,result){
			if(err){
				res.send({auth:0});
			}
			else{
				if(result.length !== 1){
					res.send({auth:0});
				}
				else{
					res.send({auth:1,message:result[0]});
				}
			}
		});
	}
	else{
		res.send({auth:0});
	}
});

app.get("/checkout/promo/:code",function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var code = req.params.code;
		if(code == ""){
			res.send({err:1,message:'code not defined'});
		}
		else{
			con.query("SELECT * FROM promo_code WHERE code="+con.escape(code)+"",function(err,result){
				if(err){
					res.send({err:1,message:'Server Error... please try again'});
				}
				else{
					if(result.length < 1){
						res.send({err:1,message:'Promo code not found!'});
					}
					else{
						var code = result[0];
						res.send({succ:1,message:code});
					}
				}
			});
		}
	}
	else{
		res.send("access denied");
	}
});

app.post("/checkout/set/address",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		var username = req.session.username;
		var state = req.body.state;
		var lg = req.body.lg;
		var str = req.body.str;
		var address = JSON.stringify({state:state,lg:lg,str:str});
		con.query("UPDATE users SET address='"+address+"' WHERE username="+con.escape(username)+"",function(err,result){
			res.send("");
		});
	}
	else{
		res.send("session expired");
	}
});

app.post("/checkout/finish/pod",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		if(req.xhr || req.accepts('json,html')==='json'){
			if(req.body.promoCode && req.body.promoCode != ""){
				var usePromo = "yes";
				var promCode = req.body.promoCode;
				var sql0 = "UPDATE promo_code SET times_used = times_used + 1 WHERE code='"+promCode+"';";
			}
			else{
				var usePromo = "no";
				var promCode = "NULL";
				var sql0 = "";
			}
			var email = req.body.email;
			var cart = req.body.cart;
			var type = "pay on delivery";
			var amount = req.body.amount;
			var username = req.body.username;
			var tracking_id = username + Date.now();
			var firstname = req.body.firstname;
			var surname = req.body.surname;
			var state = req.body.state;
			var lg = req.body.localGovernment;
			var str = req.body.streetAddress;
			var phone = req.body.phone;
			var status = "ordered";
			var queries = [];
			var sql = "INSERT INTO orders(cart,amount,type,tracking_id,username,firstname,surname,state,lg,str,status,usePromo,promCode,phone,email,payment) "+
			"VALUES('"+cart+"','"+amount+"','"+type+"','"+tracking_id+"','"+username+"',"+con.escape(firstname)+","+con.escape(surname)+","+con.escape(state)+","+con.escape(lg)+","+con.escape(str)+","+con.escape(status)+","+con.escape(usePromo)+","+con.escape(promCode)+","+con.escape(phone)+","+con.escape(email)+",'unpaid');\n";
			var cart = JSON.parse(req.body.cart);
			for(i=0;i<cart.length;i++){
				var query = "UPDATE products SET stock = stock - 1, buys = buys + 1 WHERE id='"+cart[i].id+"'";
				queries.push(query);
			}
			var sql2 = "UPDATE users SET cart='' WHERE username="+con.escape(req.session.username)+"";
			queries.push(sql2);
			con.query(sql0 + sql + queries.join(";\n ") + ";",function(err,result){
				if(err){
					res.send({err:1,message:"Your order could not be processed... please try again"});
				}
				else{
					res.clearCookie('cart');
					io.emit("new_order");
					res.send({succ:1,message:"Your Order has been successfully created. You can track and monitor your order from your dashboard.<br><br>Your tracking id is "+tracking_id});
				}
			});
		}
		else{
			res.send("ERROR: access denied!");
		}
	}
	else{
		res.send("ERROR: session expired!");
	}
});

app.post("/checkout/finish/pod",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		if(req.xhr || req.accepts('json,html')==='json'){
			request('https://api.paystack.co/transaction/verify/'+req.body.reference, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var tranx = JSON.parse(body);
					if(!tranx.status){
						res.send({err:1,message:tranx.message});
					}
					else{
						if(tranx.data.status == 'success'){
							if(req.body.usePromo && req.body.promoCode && req.body.promoCode != ""){
								var usePromo = "yes";
								var promCode = req.body.promoCode;
								con.query("UPDATE promo_code SET times_used = times_used + 1 WHERE code="+promCode+"",function(err,result){});
							}
							else{
								var usePromo = "no";
								var promCode = "NULL";
							}
							var email = req.body.email;
							var cart = req.body.cart;
							var type = "online payment";
							var amount = req.body.amount;
							var username = req.body.username;
							var tracking_id = username + Date.now();
							var firstname = req.body.firstname;
							var surname = req.body.surname;
							var state = req.body.state;
							var lg = req.body.localGovernment;
							var str = req.body.streetAddress;
							var phone = req.body.phone;
							var status = "ordered";
							var queries = [];
							var sql = "INSERT INTO orders(cart,amount,type,tracking_id,username,firstname,surname,state,lg,str,status,usePromo,promCode,phone,email,payment) "+
							"VALUES('"+cart+"','"+amount+"','"+type+"','"+tracking_id+"','"+username+"',"+con.escape(firstname)+","+con.escape(surname)+","+con.escape(state)+","+con.escape(lg)+","+con.escape(str)+","+con.escape(status)+","+con.escape(usePromo)+","+con.escape(promCode)+","+con.escape(phone)+","+con.escape(email)+",'paid');\n";
							var cart = JSON.parse(req.body.cart);
							for(i=0;i<cart.length;i++){
								var query = "UPDATE products SET stock = stock - 1, buys = buys + 1 WHERE id='"+cart[i].id+"'";
								queries.push(query);
							}
							var sql2 = "UPDATE users SET cart='' WHERE username="+con.escape(req.session.username)+"";
							queries.push(sql2);
							con.query(sql + queries.join(";\n ") + ";",function(err,result){
								if(err){
									res.send({err:1,message:"Your order could not be processed... please try again"});
								}
								else{
									res.clearCookie('cart');
									io.emit("new_order");
									res.send({succ:1,message:"Your Order has been successfully created. You can track and monitor your order from your dashboard.<br><br>Your tracking id is "+tracking_id+ "<br><br>Thanks for making a purchase"});
								}
							});
						}
						else{
							res.send({err:1,message:'Transaction not successful... Order failed'});
						}
					}
				}
				else {
					res.send({err:1,message:'Transaction verification failed!'});
				}
			});
		}
		else{
			res.send("ERROR: access denied!");
		}
	}
	else{
		res.send("ERROR: session expired!");
	}
});

app.get("/checkout/paystack/mode",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		if(req.xhr || req.accepts('json,html')==='json'){
			sitepack.get("paystack.mode",function(data){
				if(data != null){
					if(data == "live"){
						var public_key = "";
						sitepack.get("paystack.live.public_key",function(data){
							if(data != null){
								var public_key = data;
							}
							res.send({succ:1,message:public_key});
						});
					}
					else{
						res.send({err:1,message:'Sorry, you cannot pay with card right now, please try other payment methods allowed in your location'});
					}
				}
				else{
					res.send({err:1,message:'error setting up payment window'});
				}
			});
		}
		else{
			res.send({err:1,message:'unauthorized access'});
		}
	}
	else{
		res.send({err:1,message:'session expired'});
	}
});
app.get("/checkout/address",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		if(req.xhr || req.accepts('json,html')==='json'){
			var username = req.session.username;
			var resp = {}
			con.query("SELECT * FROM users WHERE username="+con.escape(username)+"",function(err,result){
				if(err){
					resp["address"] = "";
				}
				else{
					if(result.length !== 1){
						resp["address"] = "";
					}
					else{
						resp["address"] = result[0].address;
						
					}
				}
				con.query("SELECT * FROM states",function(err,result){
					if(err){
						resp["states"] = [];
					}
					else{
						resp["states"] = result;
					}
					res.send(resp);
				});
			});
		}
		else{
			res.send("access denied");
		}
	}
	else{
		res.send("session expired!");
	}
});
app.get("/update_cart_qt/:id/:qt",function(req,res){
	var id = req.params.id;
	var qt = req.params.qt;
	if(req.session.username && req.session.username != null && req.session.username != ""){
		con.query("SELECT * FROM users WHERE username="+con.escape(req.session.username)+"", function(err,result){
			if(err){
				res.send("");
			}
			else{
				if(result.length !== 1){
					res.send("");
				}
				else{
					var user = result[0];
					var cart = user.cart;
					if(cart == null || cart == "" || cart == "[]" || cart == '"[]"'){
						res.send("");
					}
					else{
						var cart = JSON.parse(cart);
						for(i=0;i<cart.length;i++){
							if(cart[i].id == id){
								cart[i].qt = qt;
							}
						}
						var cart = JSON.stringify(cart);
						con.query("UPDATE users SET cart='"+cart+"' WHERE username="+con.escape(req.session.username)+"",function(err,result){
							res.send("");
						});
					}
				}
			}
		});
	}
	else{
		if(!req.cookies.cart){
			res.send("");
		}
		else{
			var cart = JSON.parse(req.cookies.cart);
			for(i=0;i<cart.length;i++){
				if(cart[i].id == id){
					cart[i].qt = qt;
				}
			}
			res.clearCookie("cart");
			var cart = JSON.stringify(cart);
			res.cookie("cart",cart);
			res.send("");
		}
	}
});

app.get("/user/dashboard",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		con.query("SELECT * FROM users WHERE username="+con.escape(req.session.username)+"", function(err,result){
			if(err){
				res.redirect("/");
			}
			else{
				if(result.length !== 1){
					res.redirect("/");
				}
				else{
					cartNumberAsync(req,function(cart){
						var username = req.session.username;
						var user = result;
						var userStr = JSON.stringify(result);
						res.render("dashboard",{layout:'dashboard_layout',cn:cart,title:'Welcome, '+ username,user:user,userStr:userStr,username:req.session.username});
					});
				}
			}
		});
	}
	else{
		res.redirect("/");
	}
});
app.get("/item/:id", function (req,res){
	var id = req.params.id;
	con.query("SELECT * FROM products WHERE id="+con.escape(id)+"",function(err,result){
		if(err){
			res.status(404); 
			res.render('404',{layout:'plain',title:'ERROR 404: NOT FOUND'});
		}
		else{
			if(result.length !== 1){
				res.status(404); 
				res.render('404',{layout:'plain',title:'ERROR 404: NOT FOUND'});
			}
			else{
				var product = result[0];
				var nViews = Number(product.views) + 1;
				con.query("UPDATE products SET views='"+nViews+"' WHERE id='"+product.id+"'",function(err,result){});
				var ads = [];
				var products_top = [];
				con.query("SELECT * FROM ads ORDER BY id DESC", function (err,result){
					if(!err){
						var ads = result;
					}
					con.query("SELECT * FROM products WHERE top='yes' AND NOT stock='0'",function(err,result){
						if(!err){
							var products_top = result;
						}
						if(req.cookies.recent){
							var recent = JSON.parse(req.cookies.recent);
							var len = recent.length;
							while(len > 9){
								recent.pop();
								var len = recent.length;
							}
							var linn = [];
							for(i=0;i<recent.length;i++){
								if(recent[i].id == product.id){
									linn.push(1);
								}
							}
							if(linn.length == 0){
								recent.push(product);
							}
							var arr = JSON.stringify(recent);
							res.clearCookie('recent');
							res.cookie("recent",arr);
							var recentFinal = recent.reverse();
						}
						else{
							var arr = [];
							arr.push(product);
							var arn = JSON.stringify(arr);
							res.cookie("recent",arn);
							var recentFinal = arr.reverse();
						}
						cartNumberAsync(req,function(cart){
							res.render("product",{cn:cart,layout:'productLayout',recent:recentFinal,top:products_top,p_title:product.title,p_description:product.description,p_picture:product.picture,product:product,product_str:JSON.stringify(product),ads:JSON.stringify(ads)});
						});
					});
				});
			}
		}
	});
});

app.get("/category/:category",function(req,res){
	var category = req.params.category;
	var products = JSON.stringify("");
	var ads = JSON.stringify("");
	var categories_str = JSON.stringify("");
	var categories = [];
	var subcategories = JSON.stringify("");
	con.query("SELECT * FROM categories WHERE category="+con.escape(category)+"",function(err,result){
		if(err){
			if(err){
			res.status(404); 
			cartNumberAsync(req,function(cart){
			res.render('404',{cn:cart,layout:'plain',title:'ERROR 404: NOT FOUND'});
			});
			}
		}
		else{
			if(result.length == 0){
				res.status(404); 
				cartNumberAsync(req,function(cart){
					res.render('404',{cn:cart,layout:'plain',title:'ERROR 404: NOT FOUND'});
				});
			}
			else{
				con.query("SELECT * FROM ads ORDER BY id DESC; SELECT * FROM products WHERE category="+con.escape(category)+" ORDER BY id DESC;SELECT * FROM categories ORDER BY category ASC; SELECT * FROM subcategories ORDER BY subcategory ASC;",function(err,result){
					if(err){
						res.status(404); 
						cartNumberAsync(req,function(cart){
							res.render('404',{cn:cart,layout:'plain',title:'ERROR 404: NOT FOUND'});
						});
					}
					else{
						var ads = JSON.stringify(result[0]);
						var products = JSON.stringify(result[1]);
						var categories_str = JSON.stringify(result[2]);
						var categories = result[2];
						var subcategories = JSON.stringify(result[3]);
						cartNumberAsync(req,function(cart){
							res.render("products",{categories_str:categories_str,categories:categories,subcategories:subcategories,cn:cart,layout:'cats',title:category,ads:ads,products:products});
						});
					}
				});
			}
		}
	});
});

app.get("/visit",function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var dat = new Date();
		var dd = dat.getDate().toString();
		var mm = dat.getMonth().toString();
		var yyyy = dat.getFullYear().toString();
		var ip = req.ip;
		var ip = ip.toString();
		var ddd = dd + "." + mm + "." + yyyy + ':' + ip;
		var cook = req.cookies.visit;
		con.query("SELECT * FROM visits WHERE dd='"+dd+"' AND mm='"+mm+"' AND yyyy='"+yyyy+"' AND ip='"+ip+"'",function(err,result){
			if(!err && result.length == 0 && cook != ddd){
				con.query("INSERT INTO visits(dd,mm,yyyy,ip) VALUES('"+dd+"','"+mm+"','"+yyyy+"','"+ip+"')",function(err,result){
					res.cookie("visit",ddd);
					res.send("");
				});
			}
			else{
				res.send("");
			}
		});
	}
	else{
		res.send("access denied");
	}
});
app.get("/subcategory/:subcategory",function(req,res){
	var subcategory = req.params.subcategory;
	var products = JSON.stringify("");
	var ads = JSON.stringify("");
	var categories_str = JSON.stringify("");
	var categories = [];
	var subcategories = JSON.stringify("");
	con.query("SELECT * FROM subcategories WHERE subcategory="+con.escape(subcategory)+"",function(err,result){
		if(err){
			if(err){
			res.status(404); 
			cartNumberAsync(req,function(cart){
			res.render('404',{cn:cart,layout:'plain',title:'ERROR 404: NOT FOUND'});
			});
			}
		}
		else{
			if(result.length == 0){
				res.status(404); 
				cartNumberAsync(req,function(cart){
					res.render('404',{cn:cart,layout:'plain',title:'ERROR 404: NOT FOUND'});
				});
			}
			else{
				con.query("SELECT * FROM ads ORDER BY id DESC; SELECT * FROM products WHERE subcategory="+con.escape(subcategory)+" ORDER BY id DESC; SELECT * FROM categories ORDER BY category ASC; SELECT * FROM subcategories ORDER BY subcategory ASC;",function(err,result){
					if(err){
						res.status(404); 
						cartNumberAsync(req,function(cart){
							res.render('404',{cn:cart,layout:'plain',title:'ERROR 404: NOT FOUND'});
						});
					}
					else{
						var ads = JSON.stringify(result[0]);
						var products = JSON.stringify(result[1]);
						var categories_str = JSON.stringify(result[2]);
						var categories = result[2];
						var subcategories = JSON.stringify(result[3]);
						cartNumberAsync(req,function(cart){
							res.render("products",{categories_str:categories_str,categories:categories,subcategories:subcategories,cn:cart,layout:'cats',title:subcategory,ads:ads,products:products});
						});
					}
				});
			}
		}
	});
});

app.post("/admin/login", function (req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var username = req.body.admus;
		var pw = req.body.admpw;
		var pw = crypto.createHmac('sha256', pw).update(credentials.passwordCrypt).digest('hex');
		if(username != ""){
			var sql = "SELECT * FROM admin WHERE username="+con.escape(username)+"";
			con.query(sql, function (err,result){
				if(err){
					res.send("Access Denied... Server Error");
				}
				else{
					if(result.length !== 1){
						res.send("Access Denied... Login Error");
					}
					else{
						if(result[0].password == pw){
							con.query("UPDATE admin SET active_status='online'", function (err,result){});
							req.session.admin = username;
							res.send({succ:1});
						}
						else{
							res.send("Access Denied... Login Error");
						}
					}
				}
			});
		}
		else{
			rea.send("Access Denied... Invalid Username");
		}
	}
	else{
		res.send("Access Denied... Unauthorized Login Method");
	}
});

app.get("/home/search/:inv",function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var inv = req.params.inv;
		if(inv == ""){
			res.send("Access Denied");
		}
		else{
			con.query("SELECT * FROM products WHERE title LIKE '%"+inv+"%' LIMIT 75",function(err,result){
				if(err){
					res.send({err:1});
				}
				else{
					res.send({succ:1, result:result});
				}
			});
		}
	}
	else{
		res.send("Access Denied");
	}
});

app.post("/cart/add",function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		if(req.session.username && req.session.username != null && req.session.username != ""){
			var id = req.body.id;
			var username = req.session.username;
			var qt = req.body.qt;
			var newC = {id:id,qt:qt};
			con.query("SELECT * FROM users WHERE username="+con.escape(username)+"", function(err,result){
				if(err){
					res.send({err:1,message:'Server Error'});
				}
				else{
					if(result.length !== 1){
						res.send({err:1,message:'Invalid User Authenticated!'});
					}
					else{
						var user = result[0];
						var cart = user.cart;
						if(cart == null || cart == "" || cart == "[]" || cart == '"[]"'){
							var nCart = [];
							nCart.push(newC);
							var nCart = JSON.stringify(nCart);
							con.query("UPDATE users SET cart='"+nCart+"' WHERE username="+con.escape(username)+"",function(err,result){
								if(err){
									res.send({err:1,message:'Server Error'});
								}
								else{
									res.send({succ:1});
								}
							});
						}
						else{
							var cart = JSON.parse(cart);
							var readyT = [];
							for(i=0;i<cart.length;i++){
								if(cart[i].id == newC.id){
									readyT.push(1);
								}
							}
							if(readyT.length == 0){
								cart.push(newC);
								var nCart = JSON.stringify(cart);
								con.query("UPDATE users SET cart='"+nCart+"' WHERE username="+con.escape(username)+"",function(err,result){
									if(err){
										res.send({err:1,message:'Server Error'});
									}
									else{
										res.send({succ:1});
									}
								});
							}
							else{
								res.send({err:1,message:'Item Already added to cart'});
							}
						}
					}
				}
			});
		}
		else{
			var id = req.body.id;
			var username = req.session.username;
			var qt = req.body.qt;
			var newC = {id:id,qt:qt};
			if(req.cookies.cart){
				var cart = req.cookies.cart;
				var cart = JSON.parse(cart);
				var readyT = [];
				for(i=0;i<cart.length;i++){
					if(cart[i].id == newC.id){
						readyT.push(1);
					}
				}
				if(readyT.length == 0){
					cart.push(newC);
					var nCart = JSON.stringify(cart);
					res.clearCookie('cart');
					res.cookie("cart",nCart);
					res.send({succ:1});
				}
				else{
					res.send({err:1,message:'Item Already added to cart'});
				}
			}
			else{
				var cart = [];
				cart.push(newC);
				var nCart = JSON.stringify(cart);
				res.cookie("cart",nCart);
				res.send({succ:1});
			}
		}
	}
	else{
		res.send("Access Denied");
	}
});

app.get("/cart",function(req,res){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		var username = req.session.username;
		con.query("SELECT * FROM users WHERE username="+con.escape(username)+"",function(err,result){
			if(err){
				var cartF = {err:1,message:'Could not load Cart... Server Error... Please try again'};
				res.render("cart",{title:'cart',layout:'cartLayout',cart:JSON.stringify(cartF)});
			}
			else{
				if(result.length != 1){
					var cartF = {err:1,message:'Could not load Cart... Session not recognized'};
					res.render("cart",{title:'cart',layout:'cartLayout',cart:JSON.stringify(cartF)});
				}
				else{
					var cart = result[0].cart;
					if(cart == null || cart == "" || cart == "[]" || cart == '"[]"'){
						var cartF = {err:1,message:'You have an Empty Cart'};
						res.render("cart",{title:'cart',layout:'cartLayout',cart:JSON.stringify(cartF)});
					}
					else{
						var cart = JSON.parse(cart);
						parseCart(cart,function(cartF){
							res.render("cart",{title:'cart',layout:'cartLayout',cart:JSON.stringify(cartF)});
						});
					}
				}
			}
		});
	}
	else{
		if(req.cookies.cart){
			var cart = JSON.parse(req.cookies.cart);
			parseCart(cart,function(cartF){
				res.render("cart",{title:'cart',layout:'cartLayout',cart:JSON.stringify(cartF)});
			});
		}
		else{
			var cartF = {err:1,message:'You have an Empty Cart'};
			res.render("cart",{title:'cart',layout:'cartLayout',cart:JSON.stringify(cartF)});
		}
	}
});

app.get("/admin/logout", function (req,res){
	req.session.admin = "";
	req.session.admin  = null;
	delete req.session.admin;
	res.redirect("/admin");
});
app.get("/logout", function (req,res){
	req.session.username = "";
	req.session.username = null;
	delete req.session.username;
	res.redirect("/");
});

app.post("/prox/join", function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var sql = "SELECT * FROM users WHERE email='"+req.body.regem+"'";
		con.query(sql, function (err, result) {
			if(err){
				res.send("Database error! please try again");
			}
			else{
				if(result.length !== 0){
					res.send("email already registered, please use another one");
				}
				else{
					var sql = "SELECT * FROM users WHERE username='"+req.body.regus+"'";
					con.query(sql, function (err, result) {
					if(err){
						res.send("Database error! please try again");
					}
					else{
						if(result.length !== 0){
							res.send("Username already taken, please choose another one");
						}
						else{
							var stats = "registered";
							var l = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9'];
							var ref = l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)];
							var pw = req.body.regpw;
							var mykey = crypto.createHmac('sha256', pw).update(credentials.passwordCrypt).digest('hex');  
							var sql = "INSERT INTO users(username,email,password,status,ref,active_status) ";
							var link = "http://www.billeshop.heroku.com/verify/"+req.body.regem+"/"+ref;
							var sql = sql + "VALUES('"+req.body.regus+"','"+req.body.regem+"','"+mykey+"', '"+stats+"' ,'"+ref+"','offline')";
							var to = req.body.regem;
							var body = 'Hi,This email was submitted on our website during registration. Please if it was you, click on	the button or copy paste the link below into your address bar to comfirm your email address, else, ignore or report to us';
							var subject = 'Verify your new Account';
							var txt = 'Verify Email';
							var href = link;
							var big = {body:body,subject:subject,to:to,button_text:txt,button_href:href};
							send_mail(big,function(data){
								if(data.err){
									res.send("Error... please try again in some moments");
								}
								else if(data.succ){
									con.query(sql, function (err, result) {
									if(err){
									res.send("Error! please try again");
									}
									else{
									
									res.send({succ:"yeah"});
									}
									});
								}
								else{
									res.send("Error... please try again in some moments");
								}
							});
						}
					}
				});
			}
		}
	});
	
	
	}  
	else { 
	res.send("failed");
	}
});


app.get("/verify/:email/:ref",function(req,res){
	var em = req.params.email;
	var ref = req.params.ref;
	con.query("SELECT * FROM users WHERE email="+con.escape(em)+" AND ref="+con.escape(ref)+" AND status='registered' ", function(err,result){
		if(err){
			res.send("ERROR... please refresh page or try again later");
		}
		else{
			if(result.length == 1){
				con.query("UPDATE users SET status='verified' WHERE email="+con.escape(em)+" ", function(err,result){
					if(err){
						res.send("ERROR... please refresh page or try again later");
					}
					else{
						var a = new Date();
						var b = a.getFullYear();
						cartNumberAsync(req,function(cart){
							res.render("verified",{cn:cart,layout:'plain',year:b,title:'Email Verification Successful'});
						});
					}
				});
			}
			else{
				res.status(500); 
				cartNumberAsync(req,function(cart){
					res.render('500',{cn:cart,layout:'plain',title:'ERROR 500: SERVER ERROR'});
				});
			}
		}
	});
});

app.post("/prox/login",function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var sql = "SELECT * FROM users WHERE username="+con.escape(req.body.logus)+"";
		con.query(sql, function (err, result) {
			if(err){
				res.send("Server error! please try again");
			}
			else{
				if(result.length === 1){
					var ron = result[0];
					var pw = req.body.logpw;
					var mykey = crypto.createHmac('sha256', pw).update(credentials.passwordCrypt).digest('hex'); 
					if(mykey === ron.password){
						if(ron.status == "verified" || ron.status == "active"){
							req.session.username = ron.username;
							var cart = ron.cart;
							if(cart == null || cart == "" || cart == "[]" || cart == '"[]"'){
								var beCart = [];
							}
							else{
								var beCart = JSON.parse(cart);
							}
							if(req.cookies.cart){
								var feCart = JSON.parse(req.cookies.cart);
							}
							else{
								var feCart = [];
							}
							if(beCart.length == 0){
								if(feCart.length > 0){
									var nCart = JSON.stringify(feCart);
									con.query("UPDATE users SET cart='"+nCart+"' WHERE username="+con.escape(ron.username)+"",function(err,result){});
								}
							}
							else{
								if(feCart.length == 0){
									var nCart = JSON.stringify(beCart);
									res.clearCookie('cart');
									res.cookie("cart",nCart);
								}
								else{
									if(beCart.length > feCart.length){
										var nCart = JSON.stringify(beCart);
										res.clearCookie('cart');
										res.cookie("cart",nCart);
									}
									else if(beCart.length == feCart.length){}
									else{
										var nCart = beCart.concat(feCart);
										var nCart = removeDups(nCart);
										var nCart = JSON.stringify(nCart);
										con.query("UPDATE users SET cart='"+nCart+"' WHERE username="+con.escape(ron.username)+"",function(err,result){});
									}
								}
							}
							res.send({succ:"yeah"});
						}
						else if(ron.status == "registered"){
							res.send("You cannot log into your account because you are yet to verify your email... please verify your email!");
						}
						else{
							res.send("you cannot log into your account, please contact us for more details");
						}
					}
					else{
						res.send("login details do not match");
					}
				}
				else{
					res.send("Incorrect login details");
				}
			}
		});
	}
	else{
		res.send("login failed!");
	}
});

app.post("/prox/forgotpw",function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var sql = "SELECT * FROM users WHERE email="+con.escape(req.body.fggem)+"";
		con.query(sql, function(err,result){
			if(err){
				res.send("SERVER ERROR... please try again");
			}
			else{
				if(result.length == 1){
					var ref = result[0].ref;
					var link = "http://billeshop.heroku.com/reset_password/"+req.body.fggem+"/"+ref;
					var to = result[0].email;
					var body = 'Hi,This email was submitted on our website from our forgot password portal, Please if it was you, click on	the button or copy paste the link below into your address bar to recover your password, else, ignore or report to us';
					var subject = 'Recover your email';
					var txt = 'recover email';
					var href = link;
					var big = {body:body,subject:subject,to:to,button_text:txt,button_href:href};
					send_mail(big,function(data){
					if(data.err){
					res.send("Error... please try again in some moments");
					}
					else{
						res.send("A password reset link has been sent to your email, please check your inbox");
					}
					});
				}
				else{
					res.send("A password reset link has been sent to your email, please check your inbox");
				}
			}
		});
	}
	else{
		res.status(404); 
		var dd = new Date();
		var aa = dd.getFullYear();
		res.render('404',{layout:'plain',year:aa,title:'ERROR 404: NOT FOUND'});
	}
});

app.post("/prox/reset_pass", function (req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		var pw = req.body.respw;
		var mykey = crypto.createHmac('sha256', pw).update(credentials.passwordCrypt).digest('hex');  
		var sql = "UPDATE users SET password="+con.escape(mykey)+" WHERE email="+con.escape(req.body.resem)+"";
		con.query(sql, function (err,result){
			if(err){
				res.send("failed... please try again");
			}
			else{
				res.send({succ:"yeah"});
			}
		});
	}
	else{
		res.send("ERROR");
	}
});

app.get("/reset_password/:email/:ref",function(req,res){
	var em = req.params.email;
	var ref = req.params.ref;
	con.query("SELECT * FROM users WHERE email="+con.escape(em)+" AND ref="+con.escape(ref)+"  ", function(err,result){
		if(err){
			res.send("ERROR... please refresh page or try again later");
		}
		else{
			if(result.length == 1){
				var l = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9'];
				var ref = l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)] + l[Math.floor(Math.random() * 36)];
				con.query("UPDATE users SET ref='"+ref+"' WHERE email="+con.escape(em)+" ", function(err,result){
					if(err){
						res.send("ERROR... please refresh page or try again later");
					}
					else{
						var a = new Date();
						var b = a.getFullYear();
						cartNumberAsync(req,function(cart){
							res.render("reset",{cn:cart,layout:'plain',year:b,title:'Reset Password',email:em});
						});
					}
				});
			}
			else{
				res.status(404); 
				cartNumberAsync(req,function(cart){
					res.render('404',{layout:'plain',title:'ERROR 404: NOT FOUND'});
				});
			}
		}
	});
});



app.use(function (req,res){ 
	res.status(404); 
	cartNumberAsync(req,function(cart){
		res.render('404',{cn:cart,layout:'plain',title:'ERROR 404: NOT FOUND'});
	});
});
app.use(function(err, req, res, next){
	res.status(500); 
	cartNumberAsync(req,function(cart){
		res.render('500',{cn:cart,layout:'plain',title:'ERROR 500: SERVER ERROR'});
	});
});

http.listen(app.get('port'), function (){
	console.log( 'express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.' ); 
});

function validn(socket_id,username){
	con.query("SELECT * FROM users WHERE username="+con.escape(username)+" AND socket_id='"+socket_id+"' AND active_status='online'",function(err,result){
		if(err){
			return false;
		}
		else{
			if(result.length == 1){
				return "bro";
			}
			else{
				return false;
			}
		}
	});
}
function refresh_user(socket,username){
	var user = JSON.stringify("");
	var support = JSON.stringify("");
	var orders = JSON.stringify("");
	con.query("SELECT * FROM users WHERE username="+con.escape(username)+";SELECT * FROM support WHERE user="+con.escape(username)+";SELECT * FROM orders WHERE username="+con.escape(username)+" ORDER BY id DESC;SELECT active_status FROM admin LIMIT 1;",function(err,result){
		if(!err){
			var user = JSON.stringify(result[0][0]);
			var support = JSON.stringify(result[1]);
			var orders = JSON.stringify(result[2]);
			var admin = result[3][0].active_status;
			socket.emit("user_data",{admin:admin,user:user,support:support,orders:orders});
		}
	});
}
function refresh_admin(socket){
	var categories = [];
	var subcategories = [];
	var products = [];
	var orders = [];
	var users = [];
	var support = [];
	var adverts = [];
	var promo_code = [];
	var states = [];
	var visits = []; 
	var paystack_mode = "";
	var dat = new Date();
	var dd = dat.getDate();
	var mm = dat.getMonth();
	var yyyy = dat.getFullYear();
	var dat = {dd:dd,mm:mm,yyyy:yyyy};
	con.query("SELECT * FROM categories ORDER BY category ASC", function (err,result){
		if(!err){
			var categories = JSON.stringify(result);
		}
		con.query("SELECT * FROM subcategories ORDER BY subcategory ASC", function (err,result){
			if(!err){
				var subcategories = JSON.stringify(result);
			}
			con.query("SELECT * FROM products ORDER BY id DESC", function (err,result){
				if(!err){
					var products = JSON.stringify(result);
				}
				con.query("SELECT * FROM orders ORDER BY id DESC", function (err,result){
					if(!err){
						var orders = JSON.stringify(result);
					}
					con.query("SELECT * FROM users ORDER BY id DESC", function (err,result){
						if(!err){
							var users = JSON.stringify(result);
						}
						con.query("SELECT * FROM support", function (err,result){
							if(!err){
								var support = JSON.stringify(result);
							}
							con.query("SELECT * FROM ads ORDER BY id DESC", function (err,result){
								if(!err){
									var adverts = JSON.stringify(result);
								}
								con.query("SELECT * FROM promo_code ORDER BY id DESC", function (err,result){
									if(!err){
										var promo_code = JSON.stringify(result);
									}
									con.query("SELECT * FROM visits ORDER BY id DESC LIMIT 1000", function (err,result){
										if(!err){
											var visits = JSON.stringify(result);
										}
										con.query("SELECT * FROM states ORDER BY state ASC ", function (err,result){
											if(!err){
												var states = JSON.stringify(result);
											}
											sitepack.get("paystack.mode",function(data){
												if(data != null){
													var paystack_mode = data;
												}
												socket.emit("admin_update",{states:states,paystack:paystack_mode,categories:categories,subcategories:subcategories,products:products,orders:orders,users:users,support:support,adverts:adverts,promo:promo_code,visits:visits,dat:dat});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
}


function send_mail(big,fn){
	var html = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><head><!--[if gte mso 15]><xml>	<o:OfficeDocumentSettings>	<o:AllowPNG/>	<o:PixelsPerInch>96</o:PixelsPerInch>	</o:OfficeDocumentSettings></xml><![endif]--><meta http-equiv="Content-type" content="text/html; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /> <meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="format-detection" content="date=no" /><meta name="format-detection" content="address=no" /><meta name="format-detection" content="telephone=no" /><title>{{{title}}}</title>	<style type="text/css" media="screen">	/* Linked Styles */	body { padding:0 !important; margin:0 !important; display:block !important; min-width:100% !important; width:100% !important; background:#f1f1f1; -webkit-text-size-adjust:none }	a { color:#ff0000; text-decoration:none }	p { padding:0 !important; margin:0 !important }img { -ms-interpolation-mode: bicubic; /* Allow smoother rendering of resized image in Internet Explorer */ }	.text4 a { color: #777777 !important; text-decoration: none !important; }	.h2-white-m-center a { color: #ffffff !important; }	.h4-white a { color: #ffffff !important; }	.h3-white a { color: #ffffff !important; }	.text-top-white a { color: #ffffff !important; }	.text-white-m-center a { color: #ffffff !important; }	.text-white-r-m-center a { color: #ffffff !important; }	.text-white-center a { color: #ffffff !important; }	.text-white a { color: #ffffff !important; }	.text-mont a { color: #ffffff !important; }	.text-day3 a { color: #ffffff !important; }	.yellow a { color: #ebb44a !important; }	.green a { color: #3cb371 !important; }	.red a { color: #ff5e56 !important; }.text-list a { color: #777777 !important; }	.text-top a { color: #777777 !important; }/* Mobile styles */	@media only screen and (max-device-width: 480px), only screen and (max-width: 480px) {	div[class="mobile-br-1"] { height: 1px !important; background: #e8e8e8 !important; display: block !important; }div[class="mobile-br-5"] { height: 5px !important; }div[class="mobile-br-10"] { height: 10px !important; }div[class="mobile-br-15"] { height: 15px !important; }	th[class="m-td"],	td[class="m-td"],	div[class="hide-for-mobile"],	span[class="hide-for-mobile"] { display: none !important; width: 0 !important; height: 0 !important; font-size: 0 !important; line-height: 0 !important; min-height: 0 !important; }	span[class="mobile-block"] { display: block !important; }div[class="text-top"],div[class="h2-white-m-center"],div[class="text-white-m-center"],div[class="text-white-r-m-center"],div[class="h2-m-center"],div[class="text-m-center"],div[class="text-r-m-center"],div[class="text-top-white"] { text-align: center !important; }div[class="text-right"] { text-align: left !important; }div[class="img-m-center"] { text-align: center !important; }	div[class="fluid-img"] img,td[class="fluid-img"] img { width: 100% !important; max-width: 100% !important; height: auto !important; }div[class="fluid-img-logo"] img { width: 100% !important; max-width: 260px !important; height: auto !important; }	table[class="mobile-shell"] { width: 100% !important; min-width: 100% !important; }table[class="center"] { margin: 0 auto; }th[class="column-top"],th[class="column"] { float: left !important; width: 100% !important; display: block !important; }td[class="td"] { width: 100% !important; min-width: 100% !important; }	td[class="content-spacing"] { width: 15px !important; }	}	</style></head><body class="body" style="padding:0 !important; margin:0 !important; display:block !important; min-width:100% !important; width:100% !important; background:#f1f1f1; -webkit-text-size-adjust:none"><table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f1f1f1">	<tr><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="1"></td><td align="center" valign="top">	<table width="650" border="0" cellspacing="0" cellpadding="0" class="mobile-shell"><tr>	<td class="td" style="width:650px; min-width:650px; font-size:0pt; line-height:0pt; padding:0; margin:0; font-weight:normal; Margin:0"><div class="hide-for-mobile"><table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="38" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table></div><table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="20" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table><!-- Header --><table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff">	<tr><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="20"></td><td>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="32" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table><div class="fluid-img-logo" style="font-size:0pt; line-height:0pt; text-align:left"><div class="img-center" style="font-size:0pt; line-height:0pt; text-align:center"><a href="#" target="_blank"><img src="{{{logo_src}}}" mc:edit="image_6" border="0" width="277" style="max-width:277px" height="57" alt="" /></a></div></div>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="32" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	</td><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="20"></td>	</tr></table><table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="20" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	<!-- END Header -->	<!-- Section 1 --><div mc:repeatable="Select" mc:variant="Sectio 1">	<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>	<td><div class="fluid-img" style="font-size:0pt; line-height:0pt; text-align:left"><img src="images/full_width_image1.jpg" mc:edit="image_7" border="0" width="650" style="max-width:650px" height="350" alt="" /></div>	<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff">	<tr><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="30"></td><td>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="24" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table><div class="h4" style="color:#2c2c2c; font-family:Arial,sans-serif; font-size:18px; line-height:24px; text-align:left"><div mc:edit="text_3">{{{header}}}</div></div>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="10" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	<div class="text2" style="color:#777777; font-family:Arial,sans-serif; font-size:12px; line-height:20px; text-align:left"><div mc:edit="text_4">{{{body}}}</div></div>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="14" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	<!-- Butoon -->	<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>	<td align="left"><table border="0" cellspacing="0" cellpadding="0" bgcolor="#555">	<tr><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="10"></td><td>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="8" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table><div class="text-button" style="color:#ffffff; font-family:Arial,sans-serif; font-size:12px; line-height:16px; text-align:center; text-transform:uppercase"><div mc:edit="text_5"><a href="{{{button_href}}}" target="_blank" class="link-white" style="color:#ffffff; text-decoration:none"><span class="link-white" style="color:#ffffff; text-decoration:none">{{{button_text}}}</span></a></div></div>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="8" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	</td><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="10"></td>	</tr></table>	</td></tr>	</table>	<!-- END Butoon -->	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="24" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	</td><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="30"></td>	</tr></table>	</td></tr>	</table>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="20" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	</div><!-- END Section 1 --><!-- Footer --><table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ccc">	<tr><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="30"></td><td><table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>	<!-- Column -->	<th class="column-top" style="font-size:0pt; line-height:0pt; padding:0; margin:0; font-weight:normal; vertical-align:top; Margin:0"><table width="100%" border="0" cellspacing="0" cellpadding="0">	<tr><td>	<table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="4" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table><div class="text-white-m-center" style="color:#ffffff; font-family:Arial,sans-serif; font-size:12px; line-height:20px; text-align:left"><div mc:edit="text_53"><br>to unsubscribe, login to your profile and click the unsubscribe button</div></div>	<div style="font-size:0pt; line-height:0pt;" class="mobile-br-15"></div>	</td>	</tr></table>	</th>	<!-- END Column --></tr>	</table>	</td><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="30"></td>	</tr></table><table width="100%" border="0" cellspacing="0" cellpadding="0" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%"><tr><td height="20" class="spacer" style="font-size:0pt; line-height:0pt; text-align:center; width:100%; min-width:100%">&nbsp;</td></tr></table>	<!-- END Footer -->	</td></tr>	</table></td><td class="content-spacing" style="font-size:0pt; line-height:0pt; text-align:left" width="1"></td>	</tr></table></body></html>';
	sitepack.get("smtp.username",function(data){
		var username = data;
		sitepack.get("smtp.host",function(data){
			var host = data;
			sitepack.get("smtp.port",function(data){
				var port = data;
				sitepack.get("smtp.password",function(data){
					var password = data;
					sitepack.get("smtp.from",function(data){
						var from = data;
						if(username == null || password == null || host == null || from == null || port == null){
						fn({err:1,message:"server error... could not get smtp details"});
						}
						else{
						var to = big.to;
						if(typeof(to) == "array"){
						var to = to.join(",");
						}
						var subject = big.subject;
						var title = subject;
						var header = subject;
						var body = big.body;
						var logo_src = "http://www.billeshop.heroku.com/img/bille.jpg";
						var button_href = big.button_href;
						var button_text = big.button_text;
						html.replace("{{{title}}}",title);
						html.replace("{{{header}}}",header);
						html.replace("{{{body}}}",body);
						html.replace("{{{logo_src}}}",logo_src);
						html.replace("{{{button_text}}}",button_text);
						html.replace("{{{button_href}}}",button_href);
						
						var transporter = nodemailer.createTransport({
						host: host,
						port: port,
						auth: {
						user: username,
						pass: password
						}
						});
						
						var mailOptions = {
						from: from,
						to: to,
						subject: subject,
						html:html
						};
						
						transporter.sendMail(mailOptions, function(error, info){
						if (error) {
						fn({err:1,message:JSON.stringify(error)});
						} else {
						fn({succ:1,message:JSON.stringify(info)});
						}
						});
						}
					});
				});
			});
		});
	});
}



function cartNumberAsync(req,fn){
	if(req.session.username && req.session.username != null && req.session.username != ""){
		var username = req.session.username;
		con.query("SELECT * FROM users WHERE username="+con.escape(username)+"",function(err,result){
			if(err){
				fn(0);
			}
			else{
				var cart = result[0].cart;
				if(cart == null || cart == "" || cart == "[]" || cart == '"[]"'){
					fn(0);
				}
				else{
					fn(JSON.parse(cart).length);
				}
			}
		});
	}
	else{
		if(req.cookies.cart){
			var cart = req.cookies.cart;
			fn(JSON.parse(cart).length);
		}
		else{
			fn(0);
		}
	}
}

function removeDups(arr){
	var nArr = [];
	for(i=0;i<arr.length;i++){
		var elem = arr[i];
		if(!arr[i].id || !arr[i].qt){
			arr.splice(i,1);
		}
		else{
			arr[i] = JSON.stringify(elem);
		}
	}
	for(i=0;i<arr.length;i++){
		var elem = arr[i];
		if(nArr.indexOf(elem) == -1){
			 nArr.push(elem);
		}
	}
	for(i=0;i<nArr.length;i++){
		var elem = nArr[i];
		nArr[i] = JSON.parse(elem);
	}
	return nArr;
}

function parseCart(cart,fn){
	var id = [];
	for(i=0;i<cart.length;i++){
		id.push("'"+cart[i].id+"'");
	}
	con.query("SELECT * FROM products WHERE id IN ("+id.join(",")+")",function(err,result){
		if(err){
			var cartF = {err:1,message:'Could not fetch Cart... Server Error... please try again'};
			fn(cartF);
		}
		else{
			var cartR = result;
			if(cartR.length !== cart.length){
				var cartF = {err:1,message:'Invalid Cart... please try again'};
				fn(cartF);
			}
			else{
				for(i=0;i<cartR.length;i++){
					for(j=0;j<cart.length;j++){
						if(cartR[i].id == cart[j].id){
							cartR[i]["qt"] = cart[j].qt;
						}
					}
				}
				var cartF = {succ:1,message:cartR};
				fn(cartF);
			}
		}
	});
}