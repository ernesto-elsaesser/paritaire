<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>paritaire - playing</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Bootstrap -->
    <link href="css/bootstrap.min.css" rel="stylesheet" media="screen">
    <link href="css/style.css" rel="stylesheet" media="screen">

    <!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!--[if lt IE 9]>
      <script src="../../assets/js/html5shiv.js"></script>
      <script src="../../assets/js/respond.min.js"></script>
    <![endif]-->
  </head>
  <body>
    
    <div class="container">
    
      <header class="navbar navbar-inverse navbar-fixed-top bs-docs-nav" role="banner">
          <div class="navbar-header">
            <button class="navbar-toggle" type="button" data-toggle="collapse" data-target=".bs-navbar-collapse">
              <span class="sr-only">Toggle navigation</span>
              <span class="icon-bar"></span>
              <span class="icon-bar"></span>
              <span class="icon-bar"></span>
            </button>
            <a href="../" class="navbar-brand">paritaire</a>
          </div>
          <nav class="collapse navbar-collapse bs-navbar-collapse" role="navigation">
            <ul class="nav navbar-nav">
              <li>
                <a href="../getting-started">Link</a>
              </li>
            </ul>
          </nav>
      </header>
    
      <div class="row">
        <div class="col-md-4">
        
          <div class="progress">
            <div class="progress-bar" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" style="width: 60%;"></div>
          </div>
          REDs turn
          <a class="btn btn-primary" href="#">Undo</a>
          
        </div>
        <div class="col-md-4" id="field">
          
          <!-- Field -->
          
          <canvas id="canvas" width="360" height="360"> </canvas>
                  
        </div>
        <div class="col-md-4">
        
          <div class="panel panel-primary">
            <div class="panel-heading">Chat</div>
            <div class="panel-body">
            RED: Hi!<br/>
            BLUE: Hello
            </div>
          </div>
          
        </div>
      </div>

      <!-- Site footer -->
      <div class="footer">
        <p>© Blueprint 2013</p>
      </div>

    </div>
    
    <!-- the game -->
    <script src="game.js"></script>
	<script type="text/javascript">
	
	<?php
	
		if(isset($_GET["id"])) {
	
			$id = $_GET["id"];
			
			//print "var id = ".$id.";"
			// TODO: check id
	
			$fpath = "sessions/".$id.".php";
			
			$f = fopen($fpath, "r");
			
			$data = explode(",",fread($f,filesize($fpath)));
			fclose($f);

			$online = $data[0];
			$col1 = $data[1];
			$points1 = $data[2];
			$col2 = $data[3];
			$points2 = $data[4];
			$dimx = $data[5];
			$dimy = $data[6];
			$next = $data[7];
		
			if($online === "0") {
			
				print "session = new class_local_session(document.getElementById('canvas')," . $col1 . "," . $points1 . "," .
					$col2 . "," . $points2 . "," . $dimx . "," . $dimy . "," . $next . ");";
					
			}
			else {
							
				$me = 1; // TODO: code!?!
			
				print "session = new class_online_session(document.getElementById('canvas')," . $me . "," . $col1 . "," . $points1 . "," .
					$col2 . "," . $points2 . "," . $dimx . "," . $dimy . "," . $next . ");";
					
			}
			
		}
		else {
		
			// TODO: error handling
		
		}
		
	?>
		
	</script>
	
    <!-- jQuery (necessary for Bootstrap's JavaScript plugins) -->
    <script src="//code.jquery.com/jquery.js"></script>
    <!-- Include all compiled plugins (below), or include individual files as needed -->
    <script src="js/bootstrap.min.js"></script>
  </body>
</html>