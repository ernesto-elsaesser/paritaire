<?php

	include "sessions/id.php";

	if(isset($_POST["col1"]) && isset($_POST["col2"]) && isset($_POST["dim"]) && isset($_POST["online"])) {
	
		if(!isset($id)) $id = 1;
		
		$f = fopen("sessions/id.php", "w");
		fwrite($f, "<?php\n\$id=" . ($id+1) .";\n?>");
		fclose($f);
		
		$f = fopen("sessions/".$id.".php", "w");
		// player color , wins [x2], dimension x, dimension y, next starter
		fwrite($f, stripslashes($_POST["online"]) . "," . $_POST["col1"]. ",0," . $_POST["col2"] . ",0," . $_POST["dim"] . "," . $_POST["dim"] . ",1");
		fclose($f);
	
		if($_POST["online"] === "0")
			header('Location: playing.php?id='.$id);
		else
			header('Location: pending.html?id='.$id);
	}



?>
