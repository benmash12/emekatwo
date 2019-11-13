var socket = io(sitepack.siteUrl);
var change_password = {};
socket.on("user_data",function(data){
	$("#data-user").val(data.user);
	$("#data-orders").val(data.orders);
	$("#data-support").val(data.support);
	if(data.admin == "offline"){
		$("#admin_status").html("offline");
	}
	else{
		$("#admin_status").html("online");
	}
	//parse orders
	var orders = JSON.parse(data.orders);
	var ords = [];
	for(i=0;i<orders.length;i++){
		var order = orders[i];
		var cart = JSON.parse(order.cart);
		var products = [];
		for(j=0;j<cart.length;j++){
			products.push('<small>'+cart[j].title+' (quantity:'+cart[j].qt+')</small><br>');
		}
		var htm = '<div class="well"><p><strong>Name of Customer:</strong> '+order.surname+' '+order.firstname+'</p><br>'+
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
		'<p><strong>Products bought:</strong><blockquote>'+products.join("")+'</blockquote> </p>';
		
		if(order.status == "ordered" && order.type == "pay on delivery"){
			var htm = htm + '<button class="btn btn-default" style="outline:none" onclick="cancel_order('+order.id+')">cancel order</button>';
		}
		var htm = htm + '</div>';
		ords.push(htm);
	}
	if(ords.length == 0){
		$("#orders").html('you have not placed any order');
	}
	else{
		$("#orders").html(ords.join("<br>"));
	}
	//parse messages
	var support = JSON.parse(data.support);
	var messages = [];
	var newM = [];
	for(i=0;i<support.length;i++){
		var message = support[i];
		if(message.type == "send" && message.status == "unseen"){
			newM.push(1);
		}
		if(message.type == "receive"){
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
		else if(message.type == "send"){
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
		if(newM.length > 0){
			$("#message_counter").html("("+newM.length+")");
		}
	}
	$("#message_window").html(messages.join(""));
});

function help(){
	bootbox.alert('Hi there!<br>You can get help by logging in and chatting LIVE with us(admin) from your dashboard. You can also send us an email at support@'+sitepack.domain);
}

$(document).ready(function(){
	$("#navicon").on("click", function (){
		$(".hbot").slideToggle(120);
	});
	$("#preloader").hide();
	var username = $("#data-username").val();
	if(username != ""){
		socket.emit("load_user",{username:username});
	}
	else{
		window.location = "/";
	}
});


socket.on("user_new_support",function(data){
	bootbox.alert("You have a new help center message!");
	var username = $("#data-username").val();
	if(username != ""){
		socket.emit("load_user",{username:username});
	}
});
function cancel_order(id){
	bootbox.confirm("Click OK to confirm cancellation",function(result){
		if(result){
			preloader(1);
			var username = $("#data-username").val();
			socket.emit("cancel_order_user",{id:id,username:username},function(data){
				preloader(0);
				bootbox.alert(""+data);
			});
		}
	});
}

function logout(){
	bootbox.confirm("Are you sure you want to logout? Click OK to confirm logout",function(result){
		if(result){
			preloader(1);
			window.location = "/logout";
		}
	});
}

function preloader(a){
	if(a == 1){
		$("#preloader").show();
	}
	if(a == 0){
		$("#preloader").hide();
	}
}

function tab(a){
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
	if(a == "message"){
		$("#tab-message").scrollTop( $("#tab-message").height() - $(window).height());
		var username = $("#data-username").val();
		if(username != ""){
			socket.emit("user_read",username);
			$("#message_counter").html("");
		}
	}
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
}

function track_order(){
	bootbox.prompt({
		title:"Type in your tracking ID below please",
		inputType:'text',
		required:true,
		callback:function(result){
			if(result){
				preloader(1);
				socket.emit("track_order",result,function(data){
					preloader(0);
					bootbox.alert(""+data);
				});
			}
		}
	});
}

function msend(btn){
	var message = $(btn).prev().val();
	if(message == "" || message.replace(/[\n|\s]/g,"") == ""){
		//do nothing
	}
	else{
		$(btn).prev().val("");
		var htm = '<div class="send-mess"><p>'+message.replace(/[\n]/g,"<br>")+'</p><small><i class="fa fa-clock-o"></i> . just now</small></div>';
		$("#message_window").append(htm);
		var username = $("#data-username").val();
		if(username != ""){
			socket.emit("send_message_user",message);
		}
	}
}

function update_password(){
	var reg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%&*_.])[^]*$/;
	bootbox.prompt({
		inputType:'password',
		title:'Input Old Password',
		required:true,
		callback: function(result){
			if(result){
			change_password["old"] = result;
			bootbox.prompt({
				inputType:'password',
				title:'Input New Password. Password must contain at least an uppercase, lowercase, a number, a symbo, must be about 6 characters long, and must not exceed 30 chars',
				required:true,
				callback: function(result){ if(result && reg.test(result) && result.length > 5 && result.length < 30){
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
								var username = $("#data-username").val();
								if(username != ""){
									change_password["user"] = username;
									preloader(1);
									socket.emit("user_change_password",change_password, function (data){
										preloader(0);
										bootbox.alert(""+data);
									});
								}
							}
						}}
					});
				}else{
					bootbox.alert("Your new password does not meet the requirements... please select a new one");
				}}
			});
		}}
	});
}

function news(){
	preloader(1);
	socket.emit("user_newsletter_check",{vin:1},function(data){
		preloader(0);
		if(data.err){
			bootbox.alert("ERROR: "+data.message);
		}
		else{
			if(data.succ){
				var news = Number(data.message);
				if(news == 1){
					var htm = '<p>You are currently subscribed to our newsletter services</p>'+
					'<br><button class="btn btn-default" style="outline:none" onclick="change_news(0)">Unsubscribe</button>';
					bootbox.dialog({message:htm});
				}
				else if(news == 0){
					var htm = '<p>You are currently not subscribed to our newsletter services. Subscribe to receive updates from us</p>'+
					'<br><button class="btn btn-default" style="outline:none" onclick="change_news(1)">Subscribe</button>';
					bootbox.dialog({message:htm});
				}
				else{
					//do nothing
				}
			}
		}
	});
}

function change_news(a){
	bootbox.hideAll();
	if(a != null || a != ""){
		preloader(1);
		socket.emit("news_subs",a,function(data){
			preloader(0);
			bootbox.alert(""+data);
		});
	}
}