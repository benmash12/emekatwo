var socket = io(sitepack.siteUrl);
var instance = new SocketIOFileUpload(socket);
var newsl = {};
newsl["receipt"] = [];
var messobj = {};
instance.chunkSize = 1024 * 1000;
instance.maxFileSize = 1024 * 1000 * 1000 * 2;
instance.addEventListener("error", function(data){
	preloader(0);
    if (data.code === 1) {
        bootbox.alert("File bigger than upload limit, max is 2mb");
    }
    else{
    	bootbox.alert(""+data.message);
    }
});

instance.addEventListener("load", function (event){
	var filename = event.file.name;
	var filename = filename.split(".");
	var len = filename.length - 1;
	var ext = "." + filename[len];
	if(event.file.meta.upload_type == "product"){
		new_product["picture"] = event.name + ext;
	}
	if(event.file.meta.upload_type == "advert"){
		advert["picture"] = event.name + ext;
	}
});
instance.addEventListener("complete", function (event){
	if(!event.success){
		bootbox.alert("upload failed! please try again");
	}
	else{
		preloader(0);
		if(event.file.meta.upload_type == "product"){
			add_new_product_four();
		}
		if(event.file.meta.upload_type == "advert"){
			add_new_advert_two();
		}
	}
});
var new_product = {};
var change_password = {};
var advert = {};
var promo_code = {};
$(document).ready(function (){
	$("#preloader").hide();
	img_res();
	socket.emit("load_admin",{load:1});
});

socket.on("admin_new_support",function(data){
	socket.emit("load_admin",{load:1});
});


socket.on("new_order",function(){
	bootbox.alert("You have a new order!");
	socket.emit("load_admin",{load:1});
});

socket.on("admin_update", function (data){
	$("#data-categories").val(data.categories);
	$("#data-subcategories").val(data.subcategories);
	$("#data-products").val(data.products);
	$("#data-orders").val(data.orders);
	$("#data-users").val(data.users);
	$("#data-support").val(data.support);
	$("#data-adverts").val(data.adverts);
	$("#data-promo").val(data.promo);
	$("#data-states").val(data.states);
	
	//parse promo_codes
	var promo = JSON.parse(data.promo);
	var pro = [];
	if(promo.length == 0){
		$("#promo").html('<div class="container-fluid"><div class="well">No Promo Codes Uploaded Yet</div></div>');
	}
	else{
		for(i=0;i<promo.length;i++){
			var prom = promo[i];
			var htm = '<br><div class="well" >'+
			'<p><strong>'+prom.code+'</strong>('+prom.percentage+'% off)</p>'+
			'<p><strong>Used:</strong> '+prom.times_used+' times</p>'+
			'<p><strong>Timestamp:</strong> '+prom.timestamp+'</p>'+
			'<button style="outline:none" class="btn btn-default" onclick="delete_promo_code(\''+prom.id+'\')">Delete</button>'+
			'</div><br>';
			pro.push(htm);
		}
		$("#promo").html(pro.join(""));
	}
	
	$("#paystack_mode_btn").attr("data-mode",data.paystack);
	$("#paystack_mode_span").html(data.paystack);
	//parse products
	var products = JSON.parse(data.products);
	var prod = [];
	var tops = [];
	var notes = [];
	if(products.length == 0){
		$("#products").html('<div class="container-fluid"><div class="well">No Products Uploaded Yet</div></div>');
	}
	else{
		for(i=0;i<products.length;i++){
			var pud = JSON.stringify(products[i]);
			var htm = '<div id="product_search_'+products[i].id+'" class="grid">'+
			'<p> '+products[i].title+'  </p>'+
			'<p><span class="badge">&#8358;'+products[i].price+'</span></p>'+
			'<button data-det=\''+pud+'\' onclick="view_product(this)" style="outline:none" class="btn btn-xs btn-default">View Details</button>'+
			'<button onclick="delete_product('+products[i].id+')" style="outline:none" class="btn btn-xs btn-default">Delete Product</button>'+
			'</div>';
			prod.push(htm);
			if(products[i].top == "yes"){
				var htmn = '<div class="tops">'+
				'<div class="top_l">'+
				'<p>'+products[i].title+'</p>'+
				'</div>'+
				'<div class="top_r">'+
				'<button onclick="remove_top('+products[i].id+')">delete</button>'+
				'</div>'+
				'</div>';
				tops.push(htmn);
			}
			if(products[i].stock == "0" || products[i].stock == 0){
				var htmj = '<div class="topis">'+
				'<div class="top_l">'+
				'<p>'+products[i].title+'</p>'+
				'</div>'+
				'<div class="top_r">'+
				'<button data-id="'+products[i].id+'" onclick="update_stock(this)">update stock</button>'+
				'<button onclick="delete_product('+products[i].id+')">delete product</button>'+
				'</div>'+
				'</div>';
				notes.push(htmj);
			}
		}
		if(notes.length > 0){
			$("#noteBtn").css("color","red");
			$("#notin").html('These item(s) are out of stock... Users will not be able to see or order them... please update their stock or delete them');
		}
		$("#products").html(prod.join(""));
		$("#topItems").html(tops.join(""));
		$("#notes").html(notes.join(""));
	}
	
	//parse orders
	var orders = JSON.parse(data.orders);
	var ord = [];
	if(orders.length == 0){
		$("#orders").html('<div class="container-fluid"><div class="well">No Orders Yet</div></div>');
	}
	else{
		for(i=0;i<orders.length;i++){
			var htm = '<div class="grid">'+
			'<p><strong> '+orders[i].tracking_id+' </strong> </p>'+
			'<p><span class="badge"><small>'+orders[i].status+' | &#8358;'+orders[i].amount+' | '+orders[i].timestamp+'</small></span></p>'+
			'<button onclick="view_order('+orders[i].id+')" style="outline:none" class="btn btn-xs btn-default">View Order</button>'+
			'<button onclick="update_order('+orders[i].id+',\''+orders[i].status+'\',\''+orders[i].type+'\')" style="outline:none" class="btn btn-xs btn-default">Update Status</button>'+
			'</div>';
			ord.push(htm);
		}
		$("#orders").html(ord.join(""));
	}
	
	//parse advertz
	var adverts = JSON.parse(data.adverts);
	var ads = [];
	if(adverts.length == 0){
		$("#adverts").html('<div class="container-fluid"><div class="well">No Adverts Uploaded Yet</div></div>');
	}
	else{
	for(i=0;i<adverts.length;i++){
		var htm = '<div class="advert">'+
		'<div class="advert_l">'+
		'<img class="img_res" src="/uploads/'+adverts[i].picture+'">'+
		'</div>'+
		'<div class="advert_r">'+
		'<button onclick="delete_advert('+adverts[i].id+',\''+adverts[i].picture+'\')" class="btn btn-default">Delete</button>'+
		'</div>'+
		'</div>';
		ads.push(htm);
	}
	$("#adverts").html(ads.join(""));
	}
	
	//parse states 
	var states = JSON.parse(data.states);
	var stat = [];
	if(states.length == 0){
		$("#states").html('<div class="container-fluid"><div class="well">No States Uploaded Yet</div></div>');
	}
	else{
		for(i=0;i<states.length;i++){
			var state = states[i];
			var htm = '<div class="topis">'+
			'<div class="top_l">'+
			'<p>'+state.state+'</p>'+
			'</div>'+
			'<div class="top_r">'+
			'<button onclick="update_state('+state.id+')">'+state.allow+' (change)</button>'+
			'<button onclick="update_delivery_span('+state.id+')">'+state.delivery_days+' BD delivery</button>'+
			'<button onclick="update_delivery_charge('+state.id+')">&#8358;'+state.fee+' shipping fee</button>'+
			'</div>'+
			'</div>';
			stat.push(htm);
		}
		$("#states").html(stat.join(""));
	}
	
	//parse categories
	var categories = JSON.parse(data.categories);
	var subs = JSON.parse(data.subcategories);
	var cats = [];
	if(categories.length == 0){
		$("#catego").html('<div class="container-fluid"><div class="well">No Categories Uploaded Yet</div></div>');
	}
	else{
		for(i=0;i<categories.length;i++){
			var cat = categories[i];
			var htm = '<div class="well"><p><strong>'+cat.category+'</strong> <button class="btn btn-default" onclick="delete_category('+cat.id+',this,\''+cat.category+'\')">delete</button></p><div class="well"><ul>';
			for(j=0;j<subs.length;j++){
				var sub = subs[j];
				if(sub.category == cat.category){
					var htm = htm + '<li>'+sub.subcategory+'<button class="btn btn-sm btn-default" onclick="delete_subcategory('+sub.id+',this)">delete</button></li>';
				}
			}
			var htm = htm + '</ul></div></div><br>';
			cats.push(htm);
		}
		$("#catego").html(cats.join(""));
	}
	
	//parse users
	var users = JSON.parse(data.users);
	var u = [];
	if(users.length == 0){
		$("#users").html('<div class="container-fluid"><div class="well">No Users Registered Yet</div></div>');
	}
	else{
		for(i=0;i<users.length;i++){
			var user = users[i];
			var htm = '<br><div class="well" id="user_'+user.username+'">'+
			'<p><strong>username:</strong> '+user.username+'</p>'+
			'<p><strong>email:</strong> '+user.email+'</p>'+
			'<p><strong>status:</strong> '+user.status+'</p>'+
			'<p><strong>activity:</strong> '+user.active_status+'</p>'+
			'<button style="outline:none" class="btn btn-default" onclick="send_user_email(\''+user.email+'\')">send email</button>'+
			'<button data-user="'+user.username+'" style="outline:none" class="btn btn-default" onclick="view_message(this)">send message</button>'+
			'</div><br>';
			u.push(htm);
		}
		$("#users").html(u.join(""));
	}
	
	//parse stats
	$("#stat-products").html(JSON.parse(data.products).length);
	$("#stat-users").html(JSON.parse(data.users).length);
	$("#stat-orders").html(JSON.parse(data.orders).length);
	var visits = JSON.parse(data.visits);
	var dat = data.dat;
	var today = [];
	var thisMonth = [];
	for(i=0;i<visits.length;i++){
		if(visits[i].mm == dat.mm && visits[i].dd == dat.dd){
			today.push(visits[i]);
		}
		if(visits[i].mm == dat.mm){
			thisMonth.push(visits[i]);
		}
	}
	$("#stat-visit-today").html(today.length);
	$("#stat-visit-month").html(thisMonth.length);
	
	//parse messages
	var support = JSON.parse(data.support).reverse();
	var inb = removeDups(support);
	var inbox = [];
	var unseen = [];
	for(i=0;i<inb.length;i++){
		var mess = inb[i];
		var htm = '<div data-user="'+mess.user+'" onclick="view_message(this)" class="message">'+
		'<span>'+mess.user+'</span>'+
		'<small>'+mess.content.slice(0,30).replace(/[\n]/g,"")+'... | '+mess.status+'</small>'+
		'</div>';
		inbox.push(htm);
		if(mess.status == "unseen" && mess.type == "receive"){
			unseen.push(1);
		}
	}
	$("#messages").html(inbox.join(""));
	if(unseen.length > 0){
		$("#mess-btn").css("color","red");
	}
	img_res();
	
	if(messobj && messobj.user){
		var username = messobj.user;
		if(username !== ""){
		var support = JSON.parse(data.support);
		var mess = [];
		for(i=0;i<support.length;i++){
		if(support[i].user == username){
		mess.push(support[i]);
		}
		}
		var support = mess;
		var messages = [];
		for(i=0;i<support.length;i++){
		var message = support[i];
		if(message.type == "send"){
		var htm = '<div class="send-mess">'+
		'<p>'+message.content.replace(/[\n]/g,"<br>")+'</p>'+
		'<small>';
		if(message.status == "seen"){
		var htm = htm + '<i class="fa fa-check"></i><i class="fa fa-check"></i>';
		}
		if(message.status == "unseen"){
		var htm = htm + '<i class="fa fa-check"></i>';
		}
		
		var htm = htm + message.timestamp + '</small></div>';
		}
		else if(message.type == "receive"){
		var htm = '<div class="receive-mess">'+
		'<div class="rec-a">'+
		'<img src="/img/andrew.png">'+
		'</div>'+
		'<div class="rec-b">'+
		'<p>'+message.content.replace(/[\n]/g,"<br>")+'</p>'+
		'<small>'+message.timestamp+'</small>'+
		'</div>'+
		'</div>';
		}
		else{
		//do nothing
		}
		messages.push(htm);
		}
		socket.emit("admin_seen",username);
		socket.emit("user_stats",username,function(data){
		$("#user_stats").html(data);
		});
		$("#message_window").html(messages.join(""));
		}
	}
	
});

function msend(btn){
	var message = $(btn).prev().val();
	if(message == "" || message.replace(/[\n|\s]/g,"") == ""){
		//do nothing
	}
	else{
		$(btn).prev().val("");
		var htm = '<div class="send-mess"><p>'+message.replace(/[\n]/g,"<br>")+'</p><small><i class="fa fa-clock-o"></i> . just now</small></div>';
		$("#message_window").append(htm);
		var username = messobj.user;
		if(username && username != ""){
			socket.emit("send_message_admin",{message:message,user:username});
		}
	}
}

function removeDups(A){
	var B = [];
	var usernames = [];
	for(i=0;i<A.length;i++){
		usernames.push(A[i].user);
	}
	var username_two = [];
	var user_index = [];
	for(i=0;i<usernames.length;i++){
		if(username_two.indexOf(usernames[i]) == -1){
			username_two.push(usernames[i]);
			user_index.push(i);
		}
	}
	for(i=0;i<A.length;i++){
		if(user_index.indexOf(i) != -1){
			B.push(A[i]);
		}
	}
	return B;
}




function remove_top(id){
	preloader(1);
	socket.emit("remove_top",id, function (data){
		preloader(0);
		bootbox.alert(""+data);
	});
}

function view_order(id){
	var orders = JSON.parse($("#data-orders").val());
	var order = {};
	for(i=0;i<orders.length;i++){
		if(orders[i].id == id){
			order["order"] = orders[i];
		}
	}
	if(!order.order){
		$("#orderDetails").html('<div class="text-center text-danger">Order not found... please try again</div>');
	}
	else{
		var order = order.order;
		var cart = JSON.parse(order.cart);
		var products = [];
		for(i=0;i<cart.length;i++){
			products.push('<small>'+cart[i].title+' (quantity:'+cart[i].qt+')</small><br>');
		}
		var htm = '<p><strong>Name of Customer:</strong> '+order.surname+' '+order.firstname+'</p><br>'+
		'<p><strong>Order type:</strong> '+order.type+'</p><br>'+
		'<p><strong>Payment Status:</strong> '+order.payment+'</p><br>'+
		'<p><strong>Amount:</strong> &#8358;'+order.amount+'.00</p><br>'+
		'<p><strong>Status :</strong> '+order.status+'</p><br>'+
		'<p><strong>Username:</strong> '+order.username+'</p><br>'+
		'<p><strong>email:</strong> '+order.email+'</p><br>'+
		'<p><strong>Phone Number:</strong> '+order.phone+'</p><br>'+
		'<p><strong>Billing Address:</strong> '+order.str+', '+order.lg+', '+order.state+'</p><br>'+
		'<p><strong>Package Tracking Id:</strong> '+order.tracking_id+'</p><br>'+
		'<p><strong>Last Package Location:</strong> '+order.location+'</p><br>'+
		'<p><strong>Last Location Update:</strong> '+order.locationUpdate+'</p><br>'+
		'<p><strong>Order Timestamp:</strong> '+order.timestamp+' </p><br>'+
		'<p><strong>Promo Code:</strong> '+order.promCode+'</p><br>'+
		'<p><strong>Items Ordered:</strong><blockquote>'+products.join("")+'</blockquote> </p>';
		$("#orderDetails").html(htm);
	}
	tab('order');
	$("#tab-order").scrollTop(0);
}

socket.on("order_cancel",function(){
	bootbox.alert('<b>Notification</b><br>An order has just been cancelled by the customer... please check... the order\'s status was "ordered" and it was a pay on delivery order');
});
function note(){
	$("#noteBtn").css("color","#333");
	tab('note');
}
function update_state(id){
	preloader(1);
	socket.emit("update_state",id, function (data){
		preloader(0);
		bootbox.alert(""+data);
	});
}

function update_delivery_span(id){
	bootbox.prompt({
		title:'How many business days will it take to deliver in this state?',
		required:true,
		inputType:'number',
		callback:function(result){
			if(result){
				preloader(1);
				socket.emit("update_delivery_span",{id:id,del:result}, function (data){
					preloader(0);
					bootbox.alert(""+data);
				});
			}
		}
	});
}

function update_delivery_charge(id){
	bootbox.prompt({
		title:'How much will you charge for shipping per delivery to this state?',
		required:true,
		inputType:'number',
		callback:function(result){
			if(result){
				preloader(1);
				socket.emit("update_delivery_charge",{id:id,del:result}, function (data){
					preloader(0);
					bootbox.alert(""+data);
				});
			}
		}
	});
}

function update_order(id,status,type){
	switch(status){
		case "ordered":
			var htm = [];
			htm.push('<button onclick="update_order_two(\'status\',\'delivering\','+id+',0)" class="menu_butt">Update to \'Delivering\'</button>');
			if(type == "pay on delivery"){
				htm.push('<button onclick="update_order_two(\'status\',\'cancelled\','+id+',0)" class="menu_butt">Cancel POD order</button>');
			}
			bootbox.dialog({message:htm.join("")});
		break;
		case "delivering":
			var htm = [];
			htm.push('<button onclick="update_order_two(\'location\',\'set\','+id+')" class="menu_butt">Update Location</button>');
			if(type == "online payment"){
				htm.push('<button onclick="update_order_two(\'status\',\'delivered\','+id+',0)" class="menu_butt">Update to \'Delivered\'</button>');
			}
			if(type == "pay on delivery"){
				htm.push('<button onclick="update_order_two(\'status\',\'delivered\','+id+',1)" class="menu_butt">Update to \'Delivered\'</button>');
				htm.push('<button onclick="update_order_two(\'status\',\'cancelled\','+id+',0)" class="menu_butt">Cancel POD order</button>');
			}
			bootbox.dialog({message:htm.join("")});
		break;
		case "delivered":
			var htm = [];
			htm.push('<button onclick="update_order_two(\'status\',\'returned\','+id+',0)" class="menu_butt">Update status to \'returned\'</button>');
			htm.push('<button onclick="update_order_two(\'payment\',\'aii\','+id+',0)" class="menu_butt">Verify that customer paid</button>');
			bootbox.dialog({message:htm.join("")});
		break;
		case "cancelled":
			bootbox.alert("You can no longer update this, this order has been cancelled");
		break;
		case "returned":
			bootbox.alert("You can no longer update this, this order has been returned");
		break;
		default:
			bootbox.alert("Null Status!");
	}
}

function update_order_two(type,value,id,payment){
	bootbox.hideAll();
	if(type == "status"){
		if(value == "delivering"){
			preloader(1);
			socket.emit("update_order_status",{id:id,value:value},function(data){
				preloader(0);
				bootbox.confirm(""+data + "<br>Would you like to update the delivery location? Press Ok to do so", function(result){
					if(result){
						bootbox.prompt({
							title:'Type in present package location below',
							inputType:'text',
							required:true,
							callback:function(result){
								if(result){
									preloader(1);
									socket.emit("update_order_location",{id:id,value:result},function(data){
										preloader(0);
										bootbox.alert(""+data);
									});
								}
							}
						});
					}
				});
			})
		}
		else if(value == "delivered"){
			if(payment == 0){
				preloader(1);
				socket.emit("update_order_status",{id:id,value:value},function(data){
					preloader(0);
					bootbox.alert(""+data);
				});
			}
			else if(payment == 1){
				preloader(1);
				socket.emit("update_order_status",{id:id,value:value},function(data){
					preloader(0);
					bootbox.confirm(""+data+"<br><br>Please Click OK if customer has paid else click cancel",function(result){
						if(result){
							preloader(1);
							socket.emit("update_order_payment",{id:id,value:"paid"},function(data){
								preloader(0);
								bootbox.alert(""+data);
							});
						}
					});
				});
			}
			else{
				//do nothing
			}
		}
		else{
			preloader(1);
			socket.emit("update_order_status",{id:id,value:value},function(data){
			preloader(0);
			bootbox.alert(""+data);
			});
		}
	}
	else if(type == "location"){
		bootbox.prompt({
			title:'Type in present package location below',
			inputType:'text',
			required:true,
			callback:function(result){
				if(result){
					preloader(1);
					socket.emit("update_order_location",{id:id,value:result},function(data){
						preloader(0);
						bootbox.alert(""+data);
					});
				}
			}
		});
	}
	else{
		if(type == "payment"){
			preloader(1);
			socket.emit("update_order_payment",{id:id,value:"paid"},function(data){
			preloader(0);
			bootbox.alert(""+data);
			});
		}
	}
}
function users_search(){
	var htm = '<div class="inp-grp"><input type="text" id="sssin" placeholder="search username" class="inp-txt" onkeyup="user_search(this.value)"></div>'+
	'<div id="search_results" class="container-fluid"></div>';
	bootbox.dialog({message:htm});
	$("#sssin").focus();
}

function user_search(inp){
	if(inp != "" ){
		var users = JSON.parse($("#data-users").val());
		var u = [];
		for(i=0;i<users.length;i++){
			if(users[i].username.includes(inp)){
				var htm = '<div  onclick="browse_user(\''+users[i].username+'\')" class="well">'+users[i].username+'</div>';
				u.push(htm);
			}
		}
		if(u.length == 0){
			$("#search_results").html("No Results found!");
		}
		else{
			$("#search_results").html(u.join(""));
		}
	}
}


function search_products(){
	var htm = '<div class="inp-grp"><input type="text" id="sssin" placeholder="search product title" class="inp-txt" onkeyup="product_search(this.value)"></div>'+
	'<div id="search_results" class="container-fluid"></div>';
	bootbox.dialog({message:htm});
	$("#sssin").focus();
}

function product_search(inp){
	if(inp != "" ){
		var products = JSON.parse($("#data-products").val());
		var u = [];
		for(i=0;i<products.length;i++){
			if(products[i].title.includes(inp)){
				var htm = '<div  onclick="browse_product(\''+products[i].id+'\')" class="well">'+products[i].title+'</div>';
				u.push(htm);
			}
		}
		if(u.length == 0){
			$("#search_results").html("No Results found!");
		}
		else{
			$("#search_results").html(u.join(""));
		}
	}
}
function manage_promo_codes(){
	tab('pcodes');
}
function add_promo_codes(){
	bootbox.prompt({
		title:'Please write code',
		inputType:'text',
		required:true,
		callback: function (result){
			if(result){
				promo_code["code"] = result;
				bootbox.prompt({
					title:'Write how much percentage of price the code will take off',
					inputType:'number',
					required:true,
					callback: function (result){
						if(result){
							promo_code["percentage"] = result;
							preloader(1);
							socket.emit("add_promo_code",promo_code, function (data){
								preloader(0);
								bootbox.alert(""+data);
							});
						}
					}
				});
			}
		}
	});
}

function delete_promo_code(id){
	bootbox.confirm("Are you sure you want to delete this Promo Code?... click OK to proceed", function (result){
		if(result){
			preloader(1);
			socket.emit("delete_promo_code",id, function (data){
				preloader(0);
				bootbox.alert(""+data);
			});
		}
	});
}


function browse_user(username){
	bootbox.hideAll();
	window.location = '#user_'+username;
}

function browse_product(id){
	bootbox.hideAll();
	window.location = '#product_search_'+id;
}

function delete_category(id,butt,cat){
	bootbox.confirm("click OK to delete this category, all its subcategories will also be deleted", function (result){
		if(result){
			preloader(1);
			socket.emit("delete_category",{id:id,cat:cat}, function (data){
				preloader(0);
				if(data.succ){
					bootbox.alert("Deletion Successful!");
					$(butt).parent().parent().detach();
				}
				else{
					bootbox.alert("Deletion Failed!");
				}
			});
		}
	});
}

function delete_subcategory(id,butt){
	bootbox.confirm("click OK to delete this subcategory", function (result){
		if(result){
			preloader(1);
			socket.emit("delete_subcategory",id, function (data){
				preloader(0);
				if(data.succ){
					bootbox.alert("Deletion Successful!");
					$(butt).parent().detach();
				}
				else{
					bootbox.alert("Deletion Failed!");
				}
			});
		}
	});
}

function delete_advert(id,picture){
	bootbox.confirm("click OK to delete this advert", function (result){
		if(result){
			preloader(1);
			socket.emit("delete_advert",{id:id,picture:picture}, function (data){
				preloader(0);
				bootbox.alert(""+data);
			});
		}
	});
}

function db_tab(num,elem){
	$(".tab_button").each(function(){
		$(this).css("border-bottom-color","#fff");
	});
	$(".db-tab").each(function (){
		$(this).hide();
	});
	$(elem).css("border-bottom-color","#555");
	$("#db-tab-"+num).show();
	if(num == 3){
		$(elem).css("color","#000");
	}
}

function sidebar(){
	$("#admin_side").toggleClass("active");
}

function tab(a){
	$('.tab').hide();
	$("#tab-"+a).show();
	var vis = $("#data-visited").val();
	var obj = "tab('"+a.toString()+"')";
	if(typeof(JSON.parse(vis)) != "object"){
		var vis = [];
	}
	else{
		var vis = JSON.parse(vis);
	}
	var last = vis.length - 1;
	if(obj == vis[last]){
		vis.pop();
	}
	vis.push(obj);
	$("#data-visited").val(JSON.stringify(vis));
		
//	}
}

function cli(a){
	$(".tab,.dk").hide();
	var vis = $("#data-visited").val();
	var vis = JSON.parse(vis);
	vis.pop();
	var last = vis.length - 1;
	eval(vis[last]);
	$("#data-visited").val(JSON.stringify(vis));
	delete messobj.user;
}



function view_product(elem){
	var prod = JSON.parse($(elem).attr("data-det"));
	$("#product-tab-title").html(prod.title);
	$("#product-tab-img").html('<img class="img_res" src="/uploads/'+prod.picture+'">');
	if(prod.top != "yes"){
		$("#product-tab-top").html('<button data-id="'+prod.id+'"  onclick="add_to_top(this)" style="outline:none" class="btn btn-default">Add To Top Items</button><br><br>');
	}
	$("#product-tab-buttons").html("");
	$("#product-tab-buttons").append('<button data-id="'+prod.id+'"  onclick="update_stock(this)" style="outline:none" class="btn btn-default">Update No. of stock</button><br><br>');
	$("#product-tab-buttons").append('<button data-id="'+prod.id+'"  onclick="update_price(this)" style="outline:none" class="btn btn-default">Update Price</button><br><br>');
	$("#product-tab-buttons").append('<button data-id="'+prod.id+'"  onclick="update_discount(this)" style="outline:none" class="btn btn-default">Update Discount Rate</button><br><br>');
	$("#product-tab-stats").html('<p>in stock: <span id="inStock">'+prod.stock+'</span></p><p>views: '+prod.views+'</p><p>buys: '+prod.buys+'</p><p>date added: '+prod.timestamp+'</p><p>price: &#8358;<span id="inPrice">'+prod.price+'</span></p><p>discount: <span id="inDiscount">'+prod.discount+'</span>%</p>');
	$("#product-tab-dets").html('<p><strong>Description</strong></p><p>'+prod.description+'</p><br><br><p><strong>Specifications</strong></p><p>'+prod.specifications.replace(/;/g,"<br>")+'</p>');
	tab('product');
	img_res();
	setTimeout(img_res,50);
}

function add_to_top(btn){
	var id = $(btn).attr("data-id");
	if(id != ""){
		preloader(1);
		socket.emit("add_to_top",id, function (data){
			preloader(0);
			if(data.succ){
				bootbox.alert("successful!");
				$(btn).detach();
			}
			else{
				bootbox.alert(""+data);
			}
		});
	}
}

function update_stock(btn){
	var id = $(btn).attr("data-id");
		if(id != ""){
			bootbox.prompt({
				inputType:'number',
				required:true,
				title:'Writr new number of items in stock',
				callback: function (result){
					if(result){
						preloader(1);
						socket.emit("update_product_stock",{value:result,id:id}, function (data){
							preloader(0);
							if(data.succ){
								$("#inStock").html(result);
								bootbox.alert("Operation Successful!");
							}
							else{
								bootbox.alert(""+data);
							}
						});
					}
				}
			});
		}
}
function update_price(btn){
	var id = $(btn).attr("data-id");
		if(id != ""){
			bootbox.prompt({
				inputType:'number',
				required:true,
				title:'Writr new price of product in Naira',
				callback: function (result){
					if(result){
						preloader(1);
						socket.emit("update_product_price",{value:result,id:id}, function (data){
							preloader(0);
							if(data.succ){
								$("#inPrice").html(result);
								bootbox.alert("Operation Successful!");
							}
							else{
								bootbox.alert(""+data);
							}
						});
					}
				}
			});
		}
}
function update_discount(btn){
	var id = $(btn).attr("data-id");
		if(id != ""){
			bootbox.prompt({
				inputType:'number',
				required:true,
				title:'Writr new discount rate (0-100)%',
				max:100,
				min:0,
				callback: function (result){
					if(result){
						preloader(1);
						socket.emit("update_product_discount",{value:result,id:id}, function (data){
							preloader(0);
							if(data.succ){
								$("#inDiscount").html(result);
								bootbox.alert("Operation Successful!");
							}
							else{
								bootbox.alert(""+data);
							}
						});
					}
				}
			});
		}
}
function delete_product(id){
	bootbox.confirm("Are you sure you want to delete this product? click ok to proceed deletion process",function(result){
		if(result){
			preloader(1);
			socket.emit("delete_product_ii",id, function (data){
				preloader(0);
				bootbox.alert(""+data);
			});
		}
	});
}


function view_message(elem){
	var username = $(elem).attr("data-user");
	if(username !== ""){
		var support = JSON.parse($("#data-support").val());
		var mess = [];
		for(i=0;i<support.length;i++){
			if(support[i].user == username){
				mess.push(support[i]);
			}
		}
		var support = mess;
		var messages = [];
		for(i=0;i<support.length;i++){
			var message = support[i];
			if(message.type == "send"){
				var htm = '<div class="send-mess">'+
				'<p>'+message.content.replace(/[\n]/g,"<br>")+'</p>'+
				'<small>';
				if(message.status == "seen"){
					var htm = htm + '<i class="fa fa-check"></i><i class="fa fa-check"></i>';
				}
				if(message.status == "unseen"){
					var htm = htm + '<i class="fa fa-check"></i>';
				}
		
				var htm = htm + message.timestamp + '</small></div>';
			}
			else if(message.type == "receive"){
				var htm = '<div class="receive-mess">'+
				'<div class="rec-a">'+
				'<img src="/img/andrew.png">'+
				'</div>'+
				'<div class="rec-b">'+
				'<p>'+message.content.replace(/[\n]/g,"<br>")+'</p>'+
				'<small>'+message.timestamp+'</small>'+
				'</div>'+
				'</div>';
			}
			else{
				//do nothing
			}
			messages.push(htm);
		}
		$("#message_header").html(username + ' [<small id="user_stats">loading...</small>]');
		messobj["user"] = username;
		socket.emit("admin_seen",username);
		socket.emit("user_stats",username,function(data){
			$("#user_stats").html(data);
		});
		$("#message_window").html(messages.join(""));
		tab('message');
	}
	
}

function manage_adverts(){
	tab('adverts');
}

function img_res(){
	$(".img_res").each(function(){
		var width = $(this).width();
		var height = $(this).height();
		if(width >= height){
			$(this).css("width","auto").css("height","100%");
		}
		else{
			$(this).css("width","100%").css("height","auto");
		}
		$(this).css("opacity","1");
	});
}

function send_newsletters(){
	newsl["receipt"] = [];
	var users = JSON.parse($("#data-users").val());
	for(i=0;i<users.length;i++){
		var user = users[i];
		if(user.newsletter == 1 || user.newsletter == "1"){
			newsl.receipt.push(user.email);
		}
	}
	var nu = newsl.receipt.length;
	if(nu == 0){
		bootbox.alert("No user is currently subscibed to your newsletters");
	}
	else{
		$("#newsRec").html(nu);
		tab('newsletters');
	}
}

function send_user_email(email){
	newsl["receipt"] = [];
	newsl.receipt.push(email);
	var nu = newsl.receipt.length;
	if(nu == 0){
	bootbox.alert("No user is found subscribed to your newsletters");
	}
	else{
	$("#newsRec").html(email);
	tab('newsletters');
	}
}

function news_add_a(){
	bootbox.prompt({
		title:'link e.g http://www.example.com/page/item',
		inputType:'text',
		required:true,
		callback(result){
			if(result){
				var link = result;
				bootbox.prompt({
					title:'text e.g click me to visit',
					inputType:'text',
					required:true,
					callback(result){
						if(result){
							var l = '<a href="'+link+'">'+result+'</a>';
							$("#news_bod").val($("#news_bod").val() + " " + l );
						}
					}
				});
			}
		}
	});
}

function news_add_h(){
	bootbox.prompt({
		title:'header text e.g <h3>This is a header</h3>',
		inputType:'text',
		required:true,
		callback(result){
			if(result){
			var l = '\n<h3>'+result+'</h3>\n';
				$("#news_bod").val($("#news_bod").val() + l );
			}
		}
	});
}

function news_send(){
	var title = $("#news_title").val();
	var body = $("#news_bod").val();
	var btn_txt = $("#news_btn_txt").val();
	var btn_href = $("#news_btn_href").val();
	var err = [];
	if(title == ""){
		err.push("title is required");
	}
	if(body == "" || body.replace(/[\n|\s]/g,'') == ""){
		err.push("you cannot send an empty email");
	}
	if(btn_txt != "" && btn_href == ""){
		err.push("callback link for button is required");
	}
	if(btn_txt == "" && btn_href != ""){
		err.push("callback button text for button is required");
	}
	if(err.length > 0){
		bootbox.alert(""+err.join("<br>"));
	}
	else{
		preloader(1);
		var news = {title:title,body:body,txt:btn_txt,href:btn_href,receipt:newsl.receipt};
		socket.emit("send_news_admin",news,function(data){
			preloader(0);
			bootbox.alert(""+data);
		});
	}
}

function manage_categories(){
	tab('categories');
}

function add_new_category(){
	bootbox.prompt("write category name please (150 chars max)", function (result){
		if(result){
			var ver = /\w/;
			if(!ver.test(result)){
				bootbox.alert("Invalid Category name...");
			}
			else{
				preloader(1);
				socket.emit("add_new_category",{category:result}, function (data){
					preloader(0);
					bootbox.alert(""+data);
				});
			}
		}
	});
}

function add_new_subcategory(){
	var categories = JSON.parse($("#data-categories").val());
	var cats = [];
	for(i=0;i<categories.length;i++){
		cats.push('<option value="'+categories[i].category+'">'+categories[i].category+'</option>');
	}
	var htm = '<p>choose a category</p>'+
	'<div class="inp-grp"><select onchange="add_subcategory(this.value)" class="inp-txt"><option value="">--click here--</option>'+cats+'</select></div>';
	bootbox.dialog({message:htm});
}

function add_subcategory(category){
	bootbox.hideAll();
	if(category != ""){
		bootbox.prompt("write subcategory name please (150 chars max)", function (result){
			if(result){
				var ver = /\w/;
				if(!ver.test(result)){
					bootbox.alert("Invalid Subcategory name...");
				}
				else{
					preloader(1);
					socket.emit("add_new_subcategory",{category:category,subcategory:result}, function (data){
						preloader(0);
						bootbox.alert(""+data);
					});
				}
			}
		});
	}
}

function preloader(a){
	if(a == 1){
		$("#preloader").show();
	}
	if(a == 0){
		$("#preloader").hide();
	}
}

function add_new_product(){
	var categories = JSON.parse($("#data-categories").val());
	var cats = [];
	for(i=0;i<categories.length;i++){
	cats.push('<option value="'+categories[i].category+'">'+categories[i].category+'</option>');
	}
	var htm = '<p>choose a category</p>'+
	'<div class="inp-grp"><select onchange="add_new_product_two(this.value)" class="inp-txt"><option value="">--click here--</option>'+cats+'</select></div>';
	bootbox.dialog({message:htm});
}

function add_new_product_two(cat){
	bootbox.hideAll();
	if(cat != ""){
		new_product["category"] = cat;
		var subcategories = JSON.parse($("#data-subcategories").val());
		var subcats = [];
		for(i=0;i<subcategories.length;i++){
			if(subcategories[i].category == cat){
				subcats.push('<option value="'+subcategories[i].subcategory+'">'+subcategories[i].subcategory+'</option>');
			}
		}
		var htm = '<p>choose a subcategory</p>'+
		'<div class="inp-grp"><select onchange="add_new_product_three(this.value)" class="inp-txt"><option value="">--click here--</option>'+subcats+'</select></div>';
		bootbox.dialog({message:htm});
	}
}

function add_new_product_three(subcat){
	bootbox.hideAll();
	if(subcat != ""){
		new_product["subcategory"] = subcat;
		bootbox.prompt("please write title of product", function (result){
			if(result){
				var verify = /^([\w\d\s\.]){3,150}$/;
				if(!verify.test(result)){
					bootbox.alert("Invalid Title, please only words and numbers allowed!Max char. no. is 150");
				}
				else{
					new_product["title"] = result;
					var htm = '<p>Upload product picture</p>'+
					'<div class="inp-grp"><input type="file" id="product-picture" class="inp-txt"></div><button id="picture-trigger" style="outline:none" class="btn btn-default">Upload and Proceed</button>';
					bootbox.dialog({message:htm});
					instance.listenOnSubmit(document.getElementById("picture-trigger"), document.getElementById("product-picture"));
					instance.addEventListener("start", function (event){
						bootbox.hideAll();
						preloader(1);
						event.file.meta.upload_type = "product";
					});
				}
			}
		});
	}
}

function manage_users(){
	tab('users');
}
function add_new_product_four(){
	bootbox.hideAll();
	bootbox.prompt({
		inputType:'number',
		required:true,
		title:'type in price of product in Naira',
		callback: function (result){
			if(result){
				new_product["price"] = result;
				bootbox.prompt({
					inputType:'number',
					title:'Discount rate  of product in % (leave empty if there is no discount)',
					callback: function (result){
						if(result){
							new_product["discount"] = result;
						}
						else{
							new_product["discount"] = 0;
						}
						bootbox.prompt({
							inputType:'textarea',
							title:'product description(min 50, max 300)',
							min:50,
							max:300,
							required:true,
							maxlength:300,
							callback: function(result){
								new_product["description"] = result;
								bootbox.prompt({
									inputType:'textarea',
									title:'product specifications(write in this format <br><blockquote><b>key : value ;<br> key : value ;<br> key : value;</blockquote></b><br>this step can be skipped)',
									callback: function(result){
										new_product["specifications"] = result;
										bootbox.prompt({
											inputType:'number',
											title:'How many of the products are in stock?',
											required:true,
											callback: function(result){
												new_product["stock"] = result;
												upload_product();
											}
										});
									}
								});
							}
						});
					}
				});
			}
		}
	});
}

function upload_product(){
	bootbox.confirm("Click 'OK' to confirm and upload product", function (result){
		if(result){
			preloader(1);
			socket.emit("upload_new_product",new_product, function (data){
				preloader(0);
				bootbox.alert(""+data);
			});
		}
	});
}

function change_password_f(){
	bootbox.prompt({
		inputType:'password',
		title:'Input Old Password',
		required:true,
		callback: function(result){
			if(result){
			change_password["old"] = result;
			bootbox.prompt({
				inputType:'password',
				title:'Input New Password',
				required:true,
				callback: function(result){ if(result){
					change_password["new"] = result;
					bootbox.prompt({
						inputType:'password',
						title:'Confirm New Password',
						required:true,
						callback: function(result){ if(result){
							change_password["confirm"] = result;
							if(change_password["confirm"] !== change_password["new"]){
								bootbox.alert("Passwords do not match");
							}
							else{
								preloader(1);
								socket.emit("admin_change_password",change_password, function (data){
									preloader(0);
									bootbox.alert(""+data);
								});
							}
						}}
					});
				}}
			});
		}}
	});
}

function logout(){
	bootbox.confirm("Are you sure you want to Logout?<br>(click 'OK' to proceed)", function (result){
		if(result){
			window.location = "/admin/logout";
		}
	});
}

function add_new_advert(){
	var htm = '<p>Upload advert picture</p>'+
	'<div class="inp-grp"><input type="file" id="advert-picture" class="inp-txt"></div><button id="advert-trigger" style="outline:none" class="btn btn-default">Upload and Proceed</button>';
	bootbox.dialog({message:htm});
	instance.listenOnSubmit(document.getElementById("advert-trigger"), document.getElementById("advert-picture"));
	instance.addEventListener("start", function (event){
		bootbox.hideAll();
		preloader(1);
		event.file.meta.upload_type = "advert";
	});
}

function add_new_advert_two(){
	var reg = /^[http|HTTP|Http]/;
	bootbox.prompt({
		inputType:'text',
		title:'Input advert link e.g. http//example.com/flash/ ... leave empty if no link exists',
		callback: function(result){
			if(result && reg.test(result)){
				advert["link"] = result;
			}
			else{
				advert["link"] = "/";
			}
			bootbox.confirm("click OK to proceed with upload",function(result){
				if(result){
					preloader(1);
					socket.emit("admin_add_advert",advert, function (data){
						preloader(0);
						bootbox.alert(""+data);
					});
				}
				else{
					socket.emit("delete_advert_pre",advert.picture);
				}
			});
		}
	});
}

function paystack(n){
	switch(n){
		case 1:
			//switch paystack mode
			preloader(1);
			socket.emit("paystack_mode", function (data){
				preloader(0);
				bootbox.alert(""+data);
			});
			
		break;
		case 2: 
			//view paystack keys
			preloader(1);
			socket.emit("paystack_view_keys", function(data){
				preloader(0);
				if(data.succ){
					var htm = '<div class="well">Test Public Key : '+data.tpu+'</div><br>'+
					'<div class="well">Test Private Key: '+data.tpr+'</div><br>'+
					'<div class="well">Live Public Key : '+data.lpu+'</div><br>'+
					'<div class="well">Live Private Key : '+data.lpr+'</div><br>';
					bootbox.alert(""+htm);
				}
				else{
					bootbox.alert("operation failed!");
				}
			});
		
		break;
		case 3:
			//set live public key
			bootbox.prompt({
				title:'Type in key below',
				required:true,
				callback:function(result){
					if(result){
						preloader(1);
						socket.emit("paystack_set_keys",{key:'lpu',value:result}, function (data){
							preloader(0);
							bootbox.alert(""+data);
						});
					}
				}
			});
		break;
		case 4:
			//set live private key
			bootbox.prompt({
			title:'Type in key below',
			required:true,
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("paystack_set_keys",{key:'lpr',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		case 5:
			//set test public key
			bootbox.prompt({
			title:'Type in key below',
			required:true,
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("paystack_set_keys",{key:'tpu',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		case 6:
			//set test private key
			bootbox.prompt({
			title:'Type in key below',
			required:true,
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("paystack_set_keys",{key:'tpr',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		default:
	
	}
}

function smtp(n){
	switch(n){
		case 1:
			//set host
			bootbox.prompt({
				title:'Type in host url below',
				required:true,
				inputType:'text',
				callback:function(result){
					if(result){
						preloader(1);
						socket.emit("smtp_set",{key:'host',value:result}, function (data){
							preloader(0);
							bootbox.alert(""+data);
						});
					}
				}
			});
		break;
		case 2: 
			//set port
			bootbox.prompt({
			title:'Type in port below',
			required:true,
			inputType:'number',
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("smtp_set",{key:'port',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		case 3:
			//set username
			bootbox.prompt({
			title:'Type in auth username',
			required:true,
			inputType:'text',
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("smtp_set",{key:'username',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		case 4:
			//set password
			bootbox.prompt({
			title:'Type in auth password below',
			required:true,
			inputType:'text',
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("smtp_set",{key:'password',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		case 5:
			//set host
			bootbox.prompt({
			title:'Set phone number visitors can call for products enquiry',
			required:true,
			inputType:'number',
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("smtp_set",{key:'phone',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		case 6:
			//set host
			bootbox.prompt({
			title:'set callback emails that customers can reply to',
			required:true,
			inputType:'text',
			callback:function(result){
			if(result){
			preloader(1);
			socket.emit("smtp_set",{key:'from',value:result}, function (data){
			preloader(0);
			bootbox.alert(""+data);
			});
			}
			}
			});
		break;
		default:
	
	}
}