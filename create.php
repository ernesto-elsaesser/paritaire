<?php

	include "sessions/id.php";

	if(isset($_POST["col1"]) && isset($_POST["col2"])) {
	
		if(isset($id)) {
		
			$f = fopen("sessions/id.php", "w");
			fwrite($f, "<?php\n\$id=" . ($id+1) .";\n?>");
			fclose($f);
		
			$f = fopen("sessions/".$id.".php", "w");
			// player color , wins
			fwrite($f, stripslashes($_POST["col1"]). ",0\n");
			fwrite($f, stripslashes($_POST["col2"]). ",0\n");
			fwrite($f, "1"); // player who starts next game
			fclose($f);
			
		}
	
		header('Location: pending.php?id='.$id);
	}



?>
