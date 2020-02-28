<?php

function searchDirsRecursively($dir){
	$nodeList = array();
	
	$nodes = glob($dir . "/*");

	foreach($nodes as $node){
		if (is_dir($node)){
			$nodeList = array_merge(searchDirsRecursively($node), $nodeList);
		} else {
			$nodeList[] = $node;
		}
	}
	
	return $nodeList;
}

$f = searchDirsRecursively("build/TraceBeta");

foreach ($f as $node){
	if (strpos($node,"libraries") !== FALSE) continue;
	
	$parts = explode("/",$node);
	$filename = end($parts);
	$fileparts = explode(".",$filename);
	$ext = end($fileparts);
	
	if ($ext === "js"){
		echo "Calling: uglifyjs -c --keep-fnames -o $node -- $node\n";
		system("uglifyjs -c --keep-fnames -o $node -- $node");
	}
}