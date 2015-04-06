# tindermusic
tinder-audience-participation

case 1 - creating name ( from one audience member to performer)

Send: 
{
	type : "create", 
	my_id : [unique my_id generated from audience.js],
	nickname : [user typed id, alphabets, numbers, dot, underscore allowed, shorter than 12. ]
}

Respond: 
{
	type : "create-respond", 
	...
}
