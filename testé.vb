' fonctionne :
1+2*3+(4+2)
	13
1+#2A*3+sqrt(4)+(4+2)
	135
1+#2A*3 +sqrt(4 )+ (4  *t   +2)
	129((4*t)+2)
img(y,z+min(triangle(t-x,16,8,1),0),0)
	img(y,(z+min(triangle((t-x),16,8,1),0)),0)
rgb(t/10*255,t/10*255,t/10*255)
	rgb(((t/10)*255),((t/10)*255),((t/10)*255))
((x==3 || x==4) && img(y,z,t)) || ((y==3 || y==4) && img(x,z,t))
	((((x==3)||(x==4))&&img(y,z,t))||(((y==3)||(y==4))&&img(x,z,modulo((t+6),12))))
(x<2) && #00FFFF
	((x<2)&&65535)
rgb(((x<2)||(6<=x))&&red(img(y,z,t)), (((2<=x)&&(x<4))||(6<=x))&&green(img(y,z,t)), (((4<=x)&&(x<6))||(6<=x))&&blue(img(y,z,t)))
	rgb((((x<2)||(6<=x))&&red(img(y,z,t))), ((((2<=x)&&(x<4))||(6<=x))&&green(img(y,z,t))), ((((4<=x)&&(x<6))||(6<=x))&&blue(img(y,z,t))))

f(x,y,z,t)=16777215*(z==floor((sin(t*6.283/20)*4)+4))
	(16777215*(z==floor(((sin(((t*6.283)/20))*4)+4))))
f(x,y,z,t)=16777215*(z==floor(sin(t*6.283/20)*4+4))
	(16777215*(z==floor(((sin(((t*6.283)/20))*4)+4))))


' ne fonctionne pas encore :

