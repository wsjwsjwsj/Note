var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var session = require('express-session');
var checkLogin = require('./checkLogin.js');
var moment = require('moment');
var cookieParser = require('cookie-parser');    //导入中间件
var mysql = require('mysql');
/*
var mongoose = require('mongoose');

var models = require('./models/models');

var User = models.User;
var Note = models.Note;
mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error',console.error.bind(console,"数据库连接失败"));
*/

var pool = mysql.createPool({
    connectionLimit: 100,
    host: 'localhost',
    user: 'mynote' ,
    password: '666',
    database: 'mynote'
});

var app = express();

app.use(cookieParser('mynote'));    

app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

app.use(express.static(path.join(__dirname,'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
   secret:'123',
   name:'note',
   cookie:{maxAge:1000*60*60},
   resave:false,
   saveUninitialized:true
}));

app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    var err = req.session.error;
    delete req.session.error;
    res.locals.message = '';
    if (err) {
        res.locals.message = '<div class="alert alert-warning" >' + err + '</div>';
    }
    next();
});

app.get('/',checkLogin.noLogin);
app.get('/',function(req,res){
  /*
    Note.find({author:req.session.user.username}).exec(function(err,allNotes){
      if(err){
        console.log(err);
        return res.redirect('/');
      }
      res.render('index',{
          user:req.session.user,
          title:'首页',
          notes:allNotes
          });
    });
    */
    pool.getConnection(function (err, connection) {
        if(err){
            console.log(err);
            return res.redirect('/');
          }
        var query = connection.query('SELECT * FROM note WHERE author=?', req.session.user.username, function (err, allNotes) {
         	if(err){
        	    console.log(err);
       		    return res.redirect('/');
          	 }
           	res.render('index',{
                user:req.session.user,
                title:'首页',
                notes:allNotes
            	});
      	    console.log(allNotes);
        	connection.release();
      	    });
        console.log(query.sql);
   	    });
   });

app.get('/login',function(req,res){
      res.render('login',{
          title:'登录'
          });
   });
   
app.post('/login',function(req,res){

      var username=req.body.username,
          password=req.body.password;
      /*
      User.findOne({username:username},function(err,user){
         if(err){
            console.log(err);
            return res.redirect('/register');
         }
         if(!user){
            req.session.error="用户名不存在";
            console.log("用户名不存在");
            return res.redirect('/login');
         }
         
         var md5=crypto.createHash('md5'),
             md5password=md5.update(password).digest('hex');
         
         if(user.password !== md5password){
              req.session.error="密码错误";
              console.log("密码错误");
              return res.redirect('/login');
          }
          console.log("登录成功");
          user.password=null;
          delete user.password;
          req.session.user =user;
          return res.redirect('/');
         });
         */  
      pool.getConnection(function (err, connection) {
        if(err){
            console.log(err);
            return res.redirect('/register');
          }
        var query = connection.query('SELECT * FROM user WHERE username=?', username, function (err, users) {
          if(err){
              console.log(err);
              return res.redirect('/');
            }

              if(users.length == 0){
                    req.session.error="用户名不存在";
                    console.log("用户名不存在");
                    return res.redirect('/login');
              }
            var user ={
              username: users[0].username.toString(),
              password: users[0].password.toString()
            };
            console.log(user);
            var md5=crypto.createHash('md5'),
             md5password=md5.update(password).digest('hex');
            if(user.password !== md5password){
                req.session.error="密码错误";
                console.log("密码错误");
                return res.redirect('/login');
            }
            console.log("登录成功");
           // res.cookie('user', username, {httpOnly: true, signd: true, maxAge: 60*1000*60});

            user.password=null;
            delete user.password;
            req.session.user =user;
            return res.redirect('/');
    
            connection.release();
        });
        console.log(query.sql);
      });     
         
      });
      
app.get('/quit',function(req,res){
      req.session.user=null;
      return res.redirect('/login');
   });

app.get('/register',function(req,res){
      res.render('register',{
          user:req.session.user,
          title:'注册'
          });
   });
   
app.post('/register',function(req,res){
      var username=req.body.username,
          password=req.body.password,
          passwordRepeat=req.body.passwordRepeat;
          
      if(username.trim().length == 0){
         req.session.error="用户名不能为空";
         console.log("用户名不能为空");
         return res.redirect('/register');
      }
       if(!username.trim().match( /^\w{3,20}$/)){
         req.session.error="用户名至少3位，至多20位，只能包含字母、数字或下划线";
         console.log("用户名至少3位，至多20位，只能包含字母、数字或下划线");
         return res.redirect('/register');
      }
      if(password.trim().length == 0){
         req.session.error="密码不能为空";
         console.log("密码不能为空");
         return res.redirect('/register');
      }
      if(!password.trim().match(/^(?![^a-z]+$)(?![^A-Z]+$)(?!\D+$).{6,}/)){
         req.session.error="密码至少6位，必须包含数字、大写字母和小写字母";
         console.log("密码至少6位，必须包含数字、大写字母和小写字母");
         return res.redirect('/register');
      }
      if(password != passwordRepeat){
         req.session.error="两次输入的密码不一致";
         console.log("两次输入的密码不一致");
         return res.redirect('/register');
      }
      /*
      User.findOne({username:username},function(err,user){
         if(err){
            console.log(err);
            return res.redirect('/register');
         }
         if(user){
            console.log("用户名已存在");
            req.session.error="用户名已存在";
            return res.redirect('/register');
         }
         
         var md5=crypto.createHash('md5'),
             md5password=md5.update(password).digest('hex');
             
         var newUser = new User({
             username:username,
             password:md5password 
         });
         
         newUser.save(function(err,doc){
             if(err){
              console.log(err);
              return res.redirect('/register');
             }
             console.log("注册成功");
             return res.redirect('/');
         });
      
      });
      */
      pool.getConnection(function (err, connection) {
         if(err){
              console.log(err);
              return res.redirect('/register');
            }
         var query = connection.query('SELECT * FROM user WHERE username=?', username , function (err, users) {
         if(err){
              console.log(err);
              return res.redirect('/register');
            }

            if(users.length != 0){
               console.log("用户名已存在");
              req.session.error="用户名已存在";
               return res.redirect('/register');
              }
    
          var md5=crypto.createHash('md5'),
             md5password=md5.update(password).digest('hex');

             var insert = connection.query('insert into user(username, password) values(?, ?)', [username, md5password], function(err, doc){
                if(err){
                  console.log(err);
                  return res.redirect('/register');
               }
              console.log("注册成功");
              return res.redirect('/');
             });
        connection.release();
        });
      console.log(query.sql);
      });

   });

app.get('/post',function(req,res){
      res.render('post',{
          user:req.session.user,
          title:'发布'
          });
   });

app.post('/post',function(req,res){
  /*
      var note =new Note({
        title:req.body.title,
        author:req.session.user.username,
        tag:req.body.tag,
        content:req.body.content
      });
      note.save(function(err,doc){
        if(err){
           console.log(err);
           return res.redirect('/post');
        }
        console.log("文章发表成功");
        return res.redirect('/');
      })
      */
      pool.getConnection(function (err, connection) {
          if(err){
              console.log(err);
              return res.redirect('/post');
          }
          var insert = connection.query('insert into note(title,author,tag,content) values(?, ?, ?, ?)', [req.body.title, req.session.user.username, req.body.tag, req.body.content],function (err, doc) {
            if(err){
                console.log(err);
                return res.redirect('/post');
              }
            console.log("文章发表成功");
            return res.redirect('/');
            connection.release();
          });
          console.log(insert.sql);
        });
   });

app.get('/detail/:id',function(req,res){
  /*
    Note.findOne({_id:req.params._id}).exec(function(err,art){
      if(err){
        console.log(err);
        return res.redirect('/');
      }
      if(art){
      res.render('detail',{
          title:'笔记详情',
          user:req.session.user,
          art:art,
          moment:moment
          });
       }
    });
    */
      pool.getConnection(function (err, connection) {
          if(err){
              console.log(err);
              return res.redirect('/');
            }
            console.log(req.session.user);
          var query = connection.query('SELECT * FROM note WHERE id=?', req.params.id, function (err, arts) {
            if(err){
                console.log(err);
                return res.redirect('/');
              }
            /*var art ={
                title: arts[req.params.id-1].title.toString(),
                tag: arts[req.params.id-1].tag.toString(),
                content: arts[req.params.id-1].content.toString()
               // createTime: arts[req.params.id-1].createTime.toString()
            };*/
            if(arts){
                res.render('detail',{
                title:'笔记详情',
                user:req.session.user,
                art:{
                	title: arts[0].title.toString(),
                	tag: arts[0].tag.toString(),
                	content: arts[0].content.toString(),
                	createTime: arts[0].createTime.toString()
                },
                moment:moment
                });
              }
            connection.release();
          });
         console.log(query.sql);
        });
   });

app.listen(3000,function(req,res){
       console.log("app is running at port 3000");
   });
