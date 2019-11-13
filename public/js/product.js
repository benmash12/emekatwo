$(document).ready(function(){
	$("#navicon").on("click", function (){
		$(".hbot").slideToggle(120);
	});
	$("#preloader").hide();
	img_res();
	page_load();
	$.get("/visit");
});

function help(){
	bootbox.alert('Hi there!<br>You can get help by logging in and chatting LIVE with us(admin) from your dashboard. You can also send us an email at support@'+sitepack.domain);
}
var ptc = {};

function page_load(){
	//parse ads
	var ads = JSON.parse($("#data-ads").val());
	var av = [];
	if(ads.length == 0){
	$("#ads").html('<img onclick="ads_rev()" src="/img/ads.jpg"><img onclick="ads_rev()" src="/img/ads.jpg"><img onclick="ads_rev()" src="/img/ads.jpg"><img onclick="ads_rev()" src="/img/ads.jpg"><img onclick="ads_rev()" src="/img/ads.jpg">');
	}
	else{
	for(i=0;i<ads.length;i++){
	var htm = '<img onclick="ads_res(\''+ads[i].link+'\')" src="/uploads/'+ads[i].picture+'">';
	av.push(htm);
	}
	av.push('<img onclick="ads_rev()" src="/img/ads.jpg"><img onclick="ads_rev()" src="/img/ads.jpg"><img onclick="ads_rev()" src="/img/ads.jpg"><img onclick="ads_rev()" src="/img/ads.jpg">');
	$("#ads").html(av.join(""));
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

function closewindow(){
	bootbox.hideAll();
}

function ads_res(link){
	window.location = link;
}

function add_to_cart(id,stock){
	var stock = Number(stock);
	if(stock !== 0){
	if(id != ""){
		ptc["id"] = id;
		if(stock > 1){
			bootbox.prompt({
				title:'How many do you want to buy ?(quantity)',
				inputType:'number',
				min:1,
				value:'1',
				max:stock,
				required:true,
				callback:function(result){
					if(result){
						add_to_cart_two(result);
					}
				}
			});
		}
		else{
			bootbox.prompt({
				title:'How many do you want to buy ?(quantity)',
				inputType:'number',
				min:1,
				value:'1',
				required:true,
				callback:function(result){
					if(result){
						if(Number(result) > 1){
							bootbox.alert("Not Added... Only 1 quantity in stock!");
						}
						else{
							add_to_cart_two(result);
						}
					}
				}
			});
		}
	}
	}
	else{
		bootbox.alert("This product is out of stock");
	}
}

function add_to_cart_two(qt){
	ptc["qt"] = qt;
	var csrf = $("#csrf").val();
	ptc["_csrf"] = csrf;
	preloader(1);
	$.ajax({
		type:'POST',
		url:'/cart/add',
		data:ptc,
		success:function(data){
			preloader(0);
			if(data.err){
				bootbox.alert('<div class="text-center"><i style="font-size:75px" class="fa fa-warning text-danger"></i><br><br><span style="color:#000;font-size:20px;font-weight:300">Not Added to Cart... '+data.message+'...<br> TIP: You can add or remove quantities in <a href="/cart">Cart</a></span></div>');
			}
			else if(data.succ){
				bootbox.alert('<div class="text-center"><i style="font-size:75px" class="fa fa-check-circle text-success"></i><br><br><span style="color:#000;font-size:20px;font-weight:300">Added to cart!</span></div>');
				$("#cart_counter").text(Number($("#cart_counter").text()) + 1);
			}
			else{
				bootbox.alert('<div class="text-center"><i style="font-size:75px" class="fa fa-warning text-danger"></i><br><br><span style="color:#000;font-size:20px;font-weight:300">Not Added to Cart... Server Error... Please try again</span></div>');
			}
		},
		error: function (){
			preloader(0);
			bootbox.alert('<div class="text-center"><i style="font-size:75px" class="fa fa-warning text-danger"></i><br><br><span style="color:#000;font-size:20px;font-weight:300">Not Added to Cart... Server Error... Please try again</span></div>');
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