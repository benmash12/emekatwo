$(document).ready(function(){
	$("#navicon").on("click", function (){
		$(".hbot").slideToggle(120);
	});
	$("#preloader").hide();
	page_load();
	$.get("/visit");
});
function help(){
	bootbox.alert('Hi there!<br>You can get help by logging in and chatting LIVE with us(admin) from your dashboard. You can also send us an email at support@'+sitepack.domain);
}

var check = {};
var minAmount = sitepack.minAmount;

function page_load(){
	var data = JSON.parse($("#data-cart").val());
	if(data.err){
		$("#cart").html('<div class="well text-center">'+data.message+'</div>');
	}
	else if(data.succ){
		var cart = data.message;
		var total = [];
		var cartH = [];
		for(i=0;i<cart.length;i++){
			var product = cart[i];
			var deducted = pricing(product.price,product.discount);
			var htm = '<div id="cart-product-'+product.id+'" class="cart">'+
			'<div class="cart_l">'+
			'<img class="img_res" src="/uploads/'+product.picture+'">'+
			'</div>'+
			'<div class="cart_r">'+
			'<span onclick="visit_product('+product.id+')" class="cart_title">'+product.title+'</span>'+
			'<span class="cart_price">&#8358;'+deducted+' <span>(-'+product.discount+'% <strike>&#8358;'+product.price+'</strike>)</span></span>'+
			'<div class="cart_qt"><button onclick="deduct_qt(this,'+product.id+')" >-</button><input id="qt-'+product.id+'" value="'+product.qt+'" readonly><button onclick="add_qt(this,'+product.id+','+product.stock+')">+</button></div>'+
			'</div>'+
			'<button onclick="remove_product('+product.id+')" class="cart_remove"><i class="fa fa-close"></i></button>'+
			'</div>';
			cartH.push(htm);
			total.push(deducted * Number(product.qt));
		}
		$("#cart").html(cartH.join(""));
		var bal = eval(total.join("+"));
		$("#bal").html(bal);
		img_res();
	}
	else{
		$("#cart").html('<div class="well text-center">Error Fetching Cart!</div>');
	}
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

function pricing(price,discount){
	var nprice = Math.ceil(Number(price) - ((Number(discount) / 100) * Number(price)));
	return nprice.toString();
}

function deduct_qt(btn,id){
	var qt = $("#qt-"+id).val();
	if(qt !== ""){
		var qt = Number(qt);
		var newQt = qt - 1;
		if(newQt < 1){
			bootbox.alert("You cannot further reduce the quantity... you can delete it if you do not wish to buy it anymore");
		}
		else{
			$("#qt-"+id).val(newQt);
			update_stock(newQt,id);
		}
	}
}

function add_qt(btn,id,stock){
	var qt = $("#qt-"+id).val();
	if(qt !== ""){
		var qt = Number(qt);
		var newQt = qt + 1;
		if(newQt > stock){
			bootbox.alert("You cannot order more than the amount of item in stock!");
		}
		else{
			$("#qt-"+id).val(newQt);
			update_stock(newQt,id);
	}
	}
}

function remove_product(id){
	if(id != ""){
		bootbox.confirm("Are you sure you want to remove this item from your cart? click ok to remove",function(result){
			if(result){
				preloader(1);
				$.get("/cart/remove/"+id,function(data){
					preloader(0);
					if(data.succ){
						$("#cart-product-"+id).detach();
						var data = JSON.parse($("#data-cart").val());
						var cart = data.message;
						var total = [];
						for(i=0;i<cart.length;i++){
							if(cart[i].id == id){
								cart.splice(i,1);
							}
						}
						for(i=0;i<cart.length;i++){
							var product = cart[i];
							var deducted = pricing(product.price,product.discount);
							total.push(deducted * Number(product.qt));
						}
						var bal = eval(total.join("+"));
						$("#bal").html(bal);
						$("#data-cart").val(JSON.stringify(data));
						$("#cart-product-"+id).detach();
						var data = JSON.parse($("#data-cart").val());
						var cart = data.message;
						if(cart.length < 1){
							$("#bal").html("0");
						}
					}
					else{
						bootbox.alert("Removal failed! please try again");
					}
				});
			}
		});
	}
}

function update_stock(newQt,id){
	var data = JSON.parse($("#data-cart").val());
	var cart = data.message;
	var total = [];
	for(i=0;i<cart.length;i++){
		if(cart[i].id == id){
			cart[i].qt = newQt;
		}
	}
	for(i=0;i<cart.length;i++){
		var product = cart[i];
		var deducted = pricing(product.price,product.discount);
		total.push(deducted * Number(product.qt));
	}
	var bal = eval(total.join("+"));
	$("#bal").html(bal);
	$("#data-cart").val(JSON.stringify(data));
	$.get("/update_cart_qt/"+id+"/"+newQt,function(data){
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

function join(){
	closewindow();
	var a = '<h3>Register</h3><br><form  id="join" action="/prox/login" method="post"><input id="crs" name="_csrf" type="hidden" value="{{_csrfToken}}">' +
	'<div class="text-danger text-center" id="regerr"></div><br>' +
	'<div class="inp-grp"><label>Username <span>can only contain letters, underscores and numbers and must be between 4-20 characters long</span></label><input id="regus" name="regus" type="text" class="inp-txt"></div>' +
	'<div class="inp-grp"><label>Email</label><input id="regem" name="regem" type="text" class="inp-txt"></div>' +
	'<div class="inp-grp"><label>Password<span> Must contain atleast an uppercase, a lowercase, a number and a symbol and must be between 6 to 30 chracters long</span></label><input type="password" id="regpw" name="regpw" class="inp-txt"></div>' + 
	'<div class="inp-grp"> <label>Confirm Password</label><input type="password" id="regcpw" name="regcpw" class="inp-txt"></div>' + 
	'<p>By clicking the button below, i read and agreed to the <a href="/terms">terms and conditions</a> and <a href="/privacy_policy">privacy policy</a> of this site.</p><button class="btn btn-default" style="outline:none" type="submit">Register</button>' +
	'</form><div class="text-center"><button onclick="login()" class="btn btn-link" style="outline:none" >Already registered? click here</button></div><br><br><br><br>';
	bootbox.dialog({
		message:a
	});
	$("#crs").val($("#csrf").val());
	$("#regem").on("keyup", function (){
	var a = $(this).val();
	var b = /^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
	if(a == "" || !b.test(a)){
	$(this).addClass("inp-error");
	$(this).removeClass("inp-success");
	}
	else{
	$(this).addClass("inp-success");
	$(this).removeClass("inp-error");
	}
	});
	$("#regus").on("keyup", function (){
	var a = $(this).val();
	var b = /^\b([a-zA-Z0-9_]{4,20})\b$/;
	var c = /[a-zA-Z]/;
	if(a == "" || !b.test(a) || !c.test(a)){
	$(this).addClass("inp-error");
	$(this).removeClass("inp-success");
	}
	else{
	$(this).addClass("inp-success");
	$(this).removeClass("inp-error");
	}
	});
	$("#regpw").on("keyup", function (){
	var a = $(this).val();
	var b = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%&*_.])[^]*$/;
	if(a.length < 6 || a.length > 30 || !b.test(a)){
	$(this).addClass("inp-error");
	$(this).removeClass("inp-success");
	}
	else{
	$(this).addClass("inp-success");
	$(this).removeClass("inp-error");
	}
	});
	$("#regcpw").on("keyup", function (){
	var a = $(this).val();
	var b = $("#regpw").val();
	if(a == "" || a !== b){
	$(this).addClass("inp-error");
	$(this).removeClass("inp-success");
	}
	else{
	$(this).addClass("inp-success");
	$(this).removeClass("inp-error");
	}
	});
	$("#join").on("submit", function (e){
		e.preventDefault();
		var us = $("#regus").val();
		var em = $("#regem").val();
		var pw = $("#regpw").val();
		var cpw = $("#regcpw").val();
		var err = [];
		var r1 = /[a-zA-Z]/;
		var r2 = /^\b([a-zA-Z0-9_]{4,20})\b$/;
		if(us == "" || !r1.test(us) || !r2.test(us)){
			err.push("invalid username format!");
		}
		var vem = /^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
		if(!vem.test(em)){
			err.push("Invalid email ID format!");
		}
		var vpw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%&*_.])[^]*$/;
		if(!vpw.test(pw) || pw.length < 6 || pw.length > 30){
			err.push("please follow instructions when choosing a password!");
		}
		if(cpw == ""){
			err.push("please confirm your password!");
		}
		if(cpw !== pw){
			err.push("passwords do not match!");
		}
		if(err.length !== 0){
			$("#regerr").html(""+err.join("<br>"));
			window.location = "#regerr";
		}
		else{
			preloader(1);
			$("#regerr").html("");
			$.ajax({
				url:'/prox/join',
				type:'POST',
				data: $(this).serialize(),
				success: function(data){
					if(data.succ){
						closewindow();
						preloader(0);
						bootbox.dialog({
							message: '<h3 class="text-success">Registration Successful!</h3><p><strong>A confirmation email has been sent to the email ID you registered with... please confirm your email before you can login... We can\'t wait for you to be online!</strong></p>'
						});
					}
					else{
					preloader(0);
						$("#regerr").html("<strong>ERROR</strong> "+data);
						window.location = "#regerr";
					}
				},
				error: function (){
					preloader(0);
					$("#regerr").html("<strong>ERROR</strong> Registration not successful, please try again!");
					window.location = "#regerr";
				}
			});
		}
	});
}


function login(){
	closewindow();
	var a = '<h3>LOGIN</h3><br><form  id="login" action="/prox/login" method="post"><input id="crs" name="_csrf" type="hidden" value="{{_csrfToken}}">' +
	'<div class="text-danger text-center" id="logerr"></div>' +
	'<div class="inp-grp"><label>Username</label><input id="logus" name="logus" type="text" class="inp-txt"></div>' +
	'<div class="inp-grp"><label>Password</label><input type="password" id="logpw" name="logpw" class="inp-txt"></div>' + 
	'<button class="btn btn-default" style="outline:none" type="submit">Login</button>' +
	'</form><div class="text-center"><button onclick="forgot_password()" class="btn btn-link" style="outline:none" >forgot password</button></div>';
	bootbox.dialog({
		message:a
	});
	$("#crs").val($("#csrf").val());
	$("#login").on("submit", function (e){
		e.preventDefault();
		var us = $("#logus").val();
		var pw = $("#logpw").val();
		var err = [];
		if(us == ""){
			err.push("username is required!");
		}
		else{
			var b = /^\b([a-zA-Z0-9_]{4,20})\b$/;
			var c = /[a-zA-Z]/;
			if(!b.test(us) || !c.test(us)){
				err.push("invalid username format!");
			}
		}
		if(pw == ""){
			err.push("password is required");
		}
		if(err.length !== 0){
			$("#logerr").html(err.join("<br>"));
		}
		else{
			$("#logerr").html("");
			preloader(1);
			$.ajax({
				url:'/prox/login',
				type:'POST',
				data: $(this).serialize(),
				success: function(data){
					if(data.succ){
						window.location = "/user/dashboard";
					}
					else{
						preloader(0);
						$("#logerr").html("<strong>ERROR</strong> "+data);
					}
				},
				error: function (){
					preloader(0);
					$("#logerr").html("<strong>ERROR</strong> Login not successful, please try again!");
				}
			});
		}
	})
}

function visit_product(id){
	window.location = "/item/"+id;
}

function checkout(){
	if(minAmount < Number($("#bal").html())){
	preloader(1);
	$.get("/checkout/get_user_status",function(data){
		preloader(0);
		if(data.auth == 0){
			bootbox.alert("Please Login to enable you complete your purchase... Your Cart will be preserved");
		}
		else if(data.auth == 1){
			check["username"] = data.message.username;
			check["email"] = data.message.email;
			checkout_two();
		}
		else{
			bootbox.alert("System Error.. please try again");
		}
	});
	}
	else{
		bootbox.alert("Order total price cannot be less than &#8358;"+minAmount);
	}
}

function checkout_two(){
	var data = JSON.parse($("#data-cart").val());
	var cart = data.message;
	var total = [];
	for(i=0;i<cart.length;i++){
		var product = cart[i];
		var deducted = pricing(product.price,product.discount);
		total.push(deducted * Number(product.qt));
	}
	var bal = eval(total.join("+"));
	var baln = Number($("#bal").html());
	if(bal !== baln){
		botbox.alert("System error... please refresh page to correct error");
	}
	else{
		var pCode = $("#pCode").val();
		if(pCode == "" || pCode == null){
			check["usePromo"] = false;
			check["amount"] = bal.toFixed(2);
			checkout_three();
		}
		else{
			preloader(1);
			$.ajax({
				type:'get',
				url:'/checkout/promo/'+pCode,
				error:function(){
					preloader(0);
					bootbox.alert("Server Error... please try again");
				},
				success:function(data){
					preloader(0);
					if(data.err){
						bootbox.confirm("<promo code not effective<br>!"+data.message+"<br> Click Ok to proceed with checkout",function(result){
							if(result){
								check["usePromo"] = false;
								check["amount"] = bal.toFixed(2);
								checkout_three();
							}
						});
					}
					else if(data.succ){
						var promo = data.message;
						if(promo.code && promo.percentage){
							var newBal = Number(bal) - (Number(bal) * Number(promo.percentage) / 100);
							var newBal = newBal.toFixed(2);
							check["usePromo"] = true;
							check["promoCode"] = promo.code;
							check["amount"] = newBal;
							bootbox.confirm("The Promo code "+promo.code+" took off "+promo.percentage+"% from your total &#8358;"+bal+".00 <br>Your now total purchase is &#8358;"+newBal+"<br>Please click ok to proceed with checkout",function(result){
								if(result){
									checkout_three();
								}
							});
						}
						else{
							bootbox.confirm("<promo code not effective<br>! There was an error while parsing the promo code...<br> Click Ok to proceed with checkout",function(result){
								if(result){
									check["usePromo"] = false;
									check["amount"] = bal.toFixed(2);
									checkout_three();
								}
							});
						}
					}
					else{
						bootbox.alert("Server Error... please try again");
					}
				}
			});
		}
	}
}

function checkout_three(){
	preloader(1);
	$.ajax({
		url:'/checkout/address',
		type:'get',
		error:function(){
			preloader(0);
			bootbox.confirm("Error Fetching user address... Please click ok to fetch user address and continue checkout",function(result){
				if(result){
					checkout_three();
				}
			});
		},
		success:function(data){
			preloader(0);
			if(data.states.length > 0){
				$("#data-states").val(JSON.stringify(data.states));
			}
			var addr = data.address;
			if(addr == "" || addr == "{}"){
				checkout_setAddr();
			}
			else{
				var addr = JSON.parse(data.address);
				bootbox.confirm("Your billing address is: <blockquote>"+addr.str+","+addr.lg+","+addr.state+"</blockquote> Click Ok to continue checkout<br> Click Cancel to Reset Billing Address",function(result){
					if(result){
						check["state"] = addr.state;
						check["localGovernment"] = addr.lg;
						check["streetAddress"] = addr.str;
						checkout_setNames();
					}
					else{
						checkout_setAddr();
					}
				});
			}
		}
	});
}

function checkout_setNames(){
	var htm = '<h4 style="margin:0px;padding:5px;font-weight:300">Billing Details</h4><div id="addr-err" class="container-fluid text-danger text-center"></div><br>'+
	'<div class="inp-grp"><label for="surname" >Surname: </label><input id="addr-sn" name="surname" class="inp-txt" type="text"></div>'+
	'<div class="inp-grp"><label for="firstname" >First Name: </label><input id="addr-fn" name="firstname" class="inp-txt" type="text"></div>'+
	'<div class="inp-grp"><label for="phone" >Phone Number: </label><input id="addr-ph" name="phone" class="inp-txt" type="number"></div>'+
	'<button id="addr-submit" style="outline:none" class="btn btn-default">Continue</button>';
	bootbox.dialog({message:htm});
	$("#addr-submit").on("click",function(){
		var sn = $("#addr-sn").val();
		var fn = $("#addr-fn").val();
		var ph = $("#addr-ph").val();
		var err = [];
		if(fn == "" || sn == "" || ph == ""){
			err.push("All details are required");
		}
		if(!/^[a-zA-Z]{1,40}$/.test(sn)){
			err.push("Surname can only be made of letters");
		}
		if(!/^[a-zA-Z]{1,40}$/.test(fn)){
			err.push("firstname can only be made of letters");
		}
		if(err.length > 0){
			$("#addr-err").html(err.join("<br>"));
		}
		else{
			bootbox.hideAll();
			check["surname"] = sn;
			check["firstname"] = fn;
			check["phone"] = ph;
			checkout_four();
		}
	});
}

function checkout_setAddr(){
	var states = JSON.parse($("#data-states").val());
	var sta = [];
	for(i=0;i<states.length;i++){
		sta.push('<option value="'+states[i].state+'">'+states[i].state+'</option>');
	}
	var htm = '<h4 style="margin:0px;padding:5px;font-weight:300">Billing Details</h4><div id="addr-err" class="container-fluid text-danger text-center"></div><br><div class="inp-grp"><label for="state">please select your state</label><select name="state" id="addr-state" class="inp-txt"><option value="">--select state--</option>'+sta.join("")+'</select></div>'+
	'<div class="inp-grp"><label for="local_government" >Local Government: </label><input id="addr-lg" name="local_government" class="inp-txt" type="text"></div>'+
	'<div class="inp-grp"><label for="street_address" >Street Address: </label><input id="addr-str" name="street_address" class="inp-txt" type="text"></div>'+
	'<div class="inp-grp"><label for="surname" >Surname: </label><input id="addr-sn" name="surname" class="inp-txt" type="text"></div>'+
	'<div class="inp-grp"><label for="firstname" >First Name: </label><input id="addr-fn" name="firstname" class="inp-txt" type="text"></div>'+
	'<div class="inp-grp"><label for="phone" >Phone Number: </label><input id="addr-ph" name="phone" class="inp-txt" type="number"></div>'+
	'<button id="addr-submit" style="outline:none" class="btn btn-default">Continue</button>';
	bootbox.dialog({message:htm});
	$("#addr-submit").on("click",function(){
		var state = $("#addr-state").val();
		var lg = $("#addr-lg").val();
		var str = $("#addr-str").val();
		var sn = $("#addr-sn").val();
		var fn = $("#addr-fn").val();
		var ph = $("#addr-ph").val();
		var err = [];
		if(state == "" || lg == "" || str == "" || fn == "" || sn == "" || ph == ""){
			err.push("All details are required");
		}
		if(!/^[a-zA-Z]{1,40}$/.test(sn)){
			err.push("Surname can only be made of letters");
		}
		if(!/^[a-zA-Z]{1,40}$/.test(fn)){
			err.push("firstname can only be made of letters");
		}
		if(err.length > 0){
			$("#addr-err").html(err.join("<br>"));
		}
		else{
			bootbox.hideAll();
			check["state"] = state;
			check["localGovernment"] = lg;
			check["streetAddress"] = str;
			check["surname"] = sn;
			check["firstname"] = fn;
			check["phone"] = ph;
			var csrf = $("#csrf").val();
			$.ajax({
				url:'/checkout/set/address',
				type:'post',
				data:{_csrf:csrf,state:state,lg:lg,str:str}
			});
			checkout_four();
		}
	});
}

function closewindow(){
	bootbox.hideAll();
}
function checkout_four(){
	var data = JSON.parse($("#data-cart").val());
	var cart = data.message;
	var crts = []
	for(i=0;i<cart.length;i++){
		crts.push({title:cart[i].title,qt:cart[i].qt});
	}
	check["cart"] = JSON.stringify(crts);
	var states = JSON.parse($("#data-states").val());
	var del_price = {};
	for(i=0;i<states.length;i++){
		if(states[i].state == check.state){
			del_price["one"] = states[i].fee;
		}
	}
	if(!del_price.one){
		bootbox.alert("System Error... please try again");
	}
	else{
		var fee = Number(del_price.one);
		var amount = Number(check.amount);
		var newT = fee + amount;
		var newT = newT.toFixed(2);
		bootbox.confirm("The Delivery fee to "+check.state+" is &#8358;"+fee+".00 which adds to your total purchase of &#8358;"+amount+ ".00 to make it &#8358;"+newT+".<br>Please click OK to continue to checkout, else click CANCEL to cancel checkout",function(result){
			if(result){
				check["amount"] = newT;
				checkout_five();
			}
		});
	}
}

function checkout_five(){
	var htm = '<button onclick="pay_with_card()" class="menu_butt">Pay With Card</button>';
	var states = JSON.parse($("#data-states").val());
	for(i=0;i<states.length;i++){
		if(states[i].state == check.state && states[i].allow == "yes"){
			var htm = htm + '<button onclick="pay_on_delivery()" class="menu_butt">Pay On Delivery</button>';
		}
	}
	bootbox.dialog({message:htm});
}

function pay_with_card(){
	bootbox.hideAll();
	preloader(1);
	$.get("/checkout/paystack/mode",function(data){
		preloader(0);
		if(data.err){
			bootbox.confirm("ERROR: "+data.message+"... click OK to try again, else CANCEL",function(result){
				if(result){
					checkout_five();
				}
			});
		}
		else{
			if(data.succ){
				check["public_key"] = data.message;
				var htm = '<button type="button" class="menu_butt" onclick="payWithPaystack()"> Proceed </button>';
				bootbox.dialog({message:htm});
			}
			else{
				bootbox.confirm("NETWOTK ERROR... click OK to try again, else CANCEL",function(result){
					if(result){
						checkout_five();
					}
				});
			}
		}
	});
}

function pay_on_delivery(){
	bootbox.hideAll();
	preloader(1);
	var csrf = $("#csrf").val();
	check["_csrf"] = csrf;
	$.ajax({
		url:'/checkout/finish/pod',
		type:'post',
		data:check,
		error:function(){
			preloader(0);
			bootbox.confirm("NETWOTK ERROR... click OK to try again, else CANCEL",function(result){
				if(result){
					checkout_five();
				}
			});
		},
		success:function(data){
			preloader(0);
			if(data.succ){
				bootbox.alert(""+data.message);
				$("#data-cart").val("");
			}
			else if(data.err){
				bootbox.confirm(":ERROR: "+data.message+" <br>click OK to try again, else CANCEL",function(result){
					if(result){
						checkout_five();
					}
				});
			}
			else{
				bootbox.confirm(""+data+"<br>click OK to try again, else CANCEL",function(result){
					if(result){
						checkout_five();
					}
				});
			}
		}
	});
}

function payWithPaystack(){
	bootbox.hideAll();
    var handler = PaystackPop.setup({
      key:check["public_key"],
      email: check["email"],
      amount: Number(check["amount"]) * 100,
      metadata: {
         custom_fields: [
            {
                display_name: "Mobile Number",
                variable_name: "mobile_number",
                value: check["phone"]
            }
         ]
      },
      callback: function(response){
          check["reference"]  = response.reference;
          var csrf = $("#csrf").val();
          check["_csrf"] = csrf;
          checkout_pwc();
      },
      onClose: function(){
          bootbox.confirm('Press Ok to stop other, else cancel',function(result){
          	if(result){
          		checkout_five();
          	}
          });
      }
    });
    handler.openIframe();
  }
  
function checkout_pwc(){
	if(check.reference){
		preloader(1);
		$.ajax({
			url:'/checkout/finish/pwc',
			type:'post',
			data:check,
			error:function(){
			preloader(0);
				bootbox.confirm("NETWOTK ERROR... click OK to try again, else CANCEL",function(result){
					if(result){
						checkout_pwc();
					}
				});
			},
			success:function(data){
				preloader(0);
				if(data.succ){
					bootbox.alert(""+data.message);
					$("#data-cart").val("");
				}
				else if(data.err){
					bootbox.confirm(":ERROR: "+data.message+" <br>click OK to try again, else CANCEL",function(result){
						if(result){
							checkout_five();
						}
					});
				}
				else{
					bootbox.confirm(""+data+"<br>click OK to try again, else CANCEL",function(result){
						if(result){
							checkout_five();
						}
					});
				}
			}
		});
	}
	else{
		bootbox.alert("ORDER FAILED...Reference is not supplied... please contact us for more details");
	}
}