! Bienvenido(a) a Carel++!
Este programa te ayudará a visualizar la ejecución de instrucciones para Karel.

Para ello serán necesarios 2 archivos con extensión .txt:
	El primero deberá contener el mapa del mundo de Karel en formato ASCII
	en donde:
		Los espacios vacíos son representados por '.'
		Los muros son representados por '#'
		Los beepers son representados por '*'
		Karel es representado por '>' o '<' o 'v' o '^' dependiendo de 
		su orientación
	El segundo deberá contener las instrucciones de la ejecución para Karel,
	sin espacios entre líneas y escritas correctamente.

Puedes editar los archivos incluidos en la carpeta de Carel++, llamados "map.txt"
e "instructions.txt" o crear tus propios archivos y añadirlos a la carpeta.

#######################################################################################
#####################################  WARNING	#######################################
Asegúrate de que el formato de los archivos de texto ".txt" sean los adecuados para tu
sistema operativo.

		Unix : para linux
		DOS  : para Windows

De lo contrario podrán presentarse bugs

Si creas los archivos desde la misma computadora en la que ejecutaras el programa 
no debería haber ningún problema
#######################################################################################


Una vez están listos los archivos abre una Terminal o un CMD en la carpeta de Carel++ y
ejecuta el Main.exe teniendo en cuenta lo siguiente:
	La primera flag o valor que agregues después de .\Main.exe (I) representara la 
	cantidad inicial de beepers que Karel tiene en la bolsa, por ejemplo:

		.\Main.exe 5

	significará que Karel tiene 5 beepers al iniciar la ejecución.

Si ejecutas desde este punto se tomará el archivo "mapa.txt" como mapa por defecto y el 
archivo "test.txt" como instrucciones por defecto. 

Si agregaste un archivo diferente considera esto:

		.\Main.exe beepers nombre_del_mapa nombre_de_las_instrucciones

La segunda segunda flag corresponde al nombre del archivo del mapa y la tercera al nombre
del archivo de las instrucciones (si no los especificas se tomarán por defecto los
incluidos en la carpeta).

Finalmente, si quieres modificar la velocidad de la ejecución puedes agregar una cuarta flag
con un entero positivo que indique el intervalo en milisegundos que hay entre cada frame de 
la ejecución.
	
		.\Main.exe beepers nombre_del_mapa nombre_de_las_instrucciones frame_rate

Si todo salió bien verás como Karel realiza su recorrido, si no veras el error que detuvo la
ejecución de las instrucciones de Karel.



Para compilar los archivos usa los siguiente comandos:

	g++ -c Karel.cpp Board.cpp functions.cpp
	g++ Main.cpp Karel.cpp Board.cpp functions.cpp -o main
