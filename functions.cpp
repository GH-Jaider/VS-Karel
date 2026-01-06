#include "functions.hpp"

int check_linux() {
    #ifdef __linux__
            return 1;
    #endif
    return 0;
}

int penguin = check_linux();

std::map<std::string, std::vector<int>> new_instructions_map;


std::vector<std::string> txt_reader(std::string archive_name)
{
/*Recibe un string con el nombre del archivo y retorna un vector de strings con cada linea del archivo*/
    std::vector<std::string> read_txt;
    std::ifstream ifs;
    std::string line;
    ifs.open (archive_name);
    if (ifs.good()){
        while (!ifs.eof()){
        getline(ifs, line);
        read_txt.push_back(line);
        }
    }
    ifs.close();
    while (read_txt[read_txt.size()-1].size() == 0){
        read_txt.pop_back();
    }
    return read_txt;
 }

Board create_map(std::string archive_name)
{
/* crea el mapa que usaremos en el main basandose en el archivo de texto denominado como archive_name*/
    std::vector<std::string> map = txt_reader(archive_name);
    if(map.size() == 0) throw std::runtime_error("Error in the construction of the map, no file named: " + archive_name);
    int ysize = map.size();                                             //Longitud vertical del mapa
    int xsize = map[0].size();                                          //Longitud horizontal del mapa
    std::vector<Box> beepers_list;                                      //Un vector de beepers donde pondremos los beepers que encontremos
    std::vector<Box> walls_list;                                        //Un vector de muros donde pondremos los muros que encontremos
    Karel karel;                                                        //Un Karel cuyos elementos base son las coordenadas {0,0} y viendo hacia -1 (esto ultimo servira para comprobar si hay más de un karel en el mapa)
    
    bool pass = false;                                                  //Un bool pass para arreglar un error que evitaba que el codigo funcione en linux
    if((map[0][xsize-1]) == 13 && map[ysize-1].size() == xsize-1)       //Si el computador detecta el salto de linea como caracter revisar si al final del mapa el tamaño se mantiene coherente
    {
        --xsize;
        pass=true;
    }

    for(int y = 0; y < ysize; ++y)
    {
        if (map[y].size() != xsize && !pass) throw std::runtime_error("Map construction error. Inconsistent map on the line: " + std::to_string(y+1) + ".");
        
        for (int x = 0; x < xsize; ++x)
        {
            if (map[y][x] == '.' || map[y][x] == ' ' || int(map[y][x] == 13) || int(map[y][x]) == 0)
            {
            /* si hay un espacio vacio/ un punto/ un salto de linea/ on caracter nulo (los ultimos 2 son para la ejecución en linux) 
            que continue y no reviese las demas condiciones pues los espacios vacios ocupan la mayor parte del mapa(en la mayoria de los casos)*/
                continue;
            }
            else if(map[y][x] == '#')
            {
            /* si es un # significa que es un muro, lo que hace que agregue al vector walls_list un muro en {x,y}*/
                Box temp;
                temp.x=x;
                temp.y=y;
                walls_list.push_back(temp);
            }
            else if(map[y][x] == '*')
            {
            /* si es un * significa que es un beeper, lo que hace que agregue al vector beepers_list un beeper en {x,y}*/
                Box temp;
                temp.x=x;
                temp.y=y;
                beepers_list.push_back(temp);
            }
            /* las siguientes 4 son las posibilidades de karel, revisando si el valor de karel facing es igual a -1 (lo que significa que solo se ha 
            agregado un karel y asignadoles las coordenadas {x,y} y un nuevo valor facing que varia hacia donde esta viendo karel*/
            else if(map[y][x] == 'v')
            {
            /* sur = 2*/
                if(karel.facing != -1) throw std::runtime_error("Map construction error, there is more than one Karel.");
                /* Se revisa si ya se ha detectado un Karel en el mapa, si sí, se termina la ejecución y se muestra el error*/ 
                karel = Karel({x,y},2);
            }
            else if(map[y][x] == '<')
            {
            /* oeste = 1*/
                if(karel.facing != -1) throw std::runtime_error("Map construction error, there is more than one Karel.");
                karel = Karel({x,y},1);
            }
            else if(map[y][x] == '>')
            {
            /* este =3*/
                if(karel.facing != -1) throw std::runtime_error("Map construction error, there is more than one Karel.");
                karel = Karel({x,y},3);
            }
            else if(map[y][x] == '^')
            {
            /*norte = 0*/
                if(karel.facing != -1) throw std::runtime_error("Map construction error, there is more than one Karel.");
                karel = Karel({x,y},0);
            }
            else
            {
            /* si no es ninguno de los caracteres anteriores retorna error*/
                throw std::runtime_error("Map construction error, there is an unknown character in line: "+ std::to_string(y+1)+","+std::to_string(x+1) + ".\nElcaracter era: " + map[y][x]);
            }
        }
    }

    /* Si el facing de karel se mantiene en -1 significa que no se ha agregado ningun Karel*/
    if(karel.facing == -1) throw std::runtime_error("Map construction error, no karel on the map.");
    Board mapa(karel, beepers_list, walls_list, xsize, ysize);
    return mapa;
}


void print_logo(std::string archive_name){
    std::vector<std::string> logo = txt_reader(archive_name);
    for (std::string line : logo)
        std::cout << line << "\n"; 
    char temp = std::cin.get();
    if (temp == '\n')
        penguin ? system("clear"): system("cls");
}


bool parsingBegin_End(std::vector<std::string> &instructions){ 
    /* Revisa que la cantidad ed BEGIN's en el archivo coincida con la cantidad de END's en el archivo*/ 
    std::stack<std::string> b_e_stack; 
    for (int i = 0; i < instructions.size(); i++){
        if (std::regex_match(instructions[i], begin))
            b_e_stack.push(instructions[i]);
 
        else if(std::regex_match(instructions[i], end)){
                if (b_e_stack.size() > 0) b_e_stack.pop();
                else return false;
        }
    }
    return (b_e_stack.empty());
}


void read_instructions(std::string archive_name, Board &Kboard)
{
/* lee un archivo de texto con las instrucciones de karel, comprueba errores de codigo y ejecuta todo*/
    int tabs = 1;
    std::vector<std::string> instructions = txt_reader(archive_name);

    if(!std::regex_match(instructions[0],BOP)) throw std::runtime_error("Reading instructions error, the code does not start with 'BEGINNING-OF-PROGRAM'.");
    if(!std::regex_match(instructions[instructions.size()-1],EOP)) throw std::runtime_error("Reading instructions error, the code does not end with 'END-OF-PROGRAM'.\n The line is: '" + instructions[instructions.size()-1]+ "'");
    if(!std::regex_match(instructions[instructions.size()-2],EOE)) throw std::runtime_error("Reading instructions error, the 'END-OF-EXECUTION was not found in the penultimate line'.\nLa The line is: " + instructions[instructions.size()-2]);
    if(!std::regex_match(instructions[instructions.size()-3],turnoff)) throw std::runtime_error("Reading instructions error, the 'turnoff' line does not exist or is not in the correct position.");
    if(!parsingBegin_End(instructions)) throw std::runtime_error("Reading instructions error, BEGIN's and EDN's statements pairing is not appropriate ");
    else
        for(int line = 1; line<instructions.size()-3; ++line)
        {
            read_line(instructions, line, tabs, Kboard);
        }
}


void read_line(std::vector<std::string> &instructions, int &line, int &tabs, Board &Kboard)
{
    /* Ejecuta una linea determinada de las instrucciones */
    tabs_error(instructions[line],tabs, line);
    if (tabs==1)
    {
        if (std::regex_match(instructions[line],BOE))
        {
            ++tabs;
            return;
        }
        else if (std::regex_match(instructions[line],newinstruction))
        {
            define_new_instruction(instructions,line);
            return;
        }
        else
        {
            throw std::runtime_error("Reading instructions error in line:  "+std::to_string(line+1));
        }
        
    }
    
    if (std::regex_match(instructions[line],end))
        {
            return;
        }
    
    switch (check_type(instructions[line]))
    {
    case 0:
        basic_instructions(instructions, instructions[line], Kboard, line, tabs);
        break;
    case 1:
        Ifthen(instructions,line,tabs,Kboard);
        break;
    case 2:
        whileDo(instructions, line, tabs, Kboard);
        break;
    case 3:
        iterateTimes(instructions, line, tabs, Kboard);
        break;
    default:
        break;
    }
}


bool check_tabs(std::string code, int tabs, int line)
{
    /* Revisa que las tabulaciones en una determinada linea sean correctas */
    for(unsigned int ch=0; ch<tabs; ch++)
    {
        if(int(code[ch])!=9) 
        {
            return false;
        }
    }
    if(int(code[tabs])==9)
    {
        return false;
    }
    return true;
}


void tabs_error(std::string code, int tabs, int line)
{
    /*  Wrapper para mostrar si las tabulaciones son incorrectas */
    if(!check_tabs(code, tabs, line)) throw std::runtime_error("Reading instructions error in line: "+ std::to_string(line+1));
}


bool check_semicolon(std::vector<std::string> &instructions, int &line){
    /* Revisa si la linea deberia tener punto y coma*/
    return !std::regex_match(instructions[line+1], end);
}


void semicolon_error(std::vector<std::string> &instructions, int &line){
    /* Manejo del error por punto y coma, imprime si hay un error de punto y coma en una linea determinada */ 
    std::string line_to_check = instructions[line];
    if (line_to_check[line_to_check.size()-1] == ';'){
        if (std::regex_match(instructions[line+1], end))
            throw std::runtime_error("There is no need to put ';' if the next line is an END.");}
    else if (!(std::regex_match(instructions[line+1], end)))
        throw std::runtime_error("Semicolon missing on the line: " + std::to_string(line+1)); 
}


unsigned int check_type(std::string instruction)
{
    /* Revisa que tipo de instruccion que utiliza condiciones se esta usando*/ 
    if(std::regex_match(instruction,ifthen))
    {
        return 1;
    }
    else if (std::regex_match(instruction,whiledo))
    {
        return 2;
    }
    else if (std::regex_match(instruction,iterate))
    {
        return 3;
    }
    else if (std::regex_match(instruction,Else))
    {
        return 4;
    }
    return 0;
}


void basic_instructions(std::vector<std::string> &instructions, std::string instruction, Board &Kboard, int line, int tabs)
{
    /* Ejecuta las instrucciones basicas de Karel*/
    semicolon_error(instructions, line);
    std::string no_tab_instruction = check_semicolon(instructions,line) ? instruction.substr(tabs,instruction.size()-tabs-1) : instruction.substr(tabs,instruction.size()-tabs);
    if(std::regex_match(instruction,move))
    {
        Kboard.move();
    }
    else if (std::regex_match(instruction,turnleft))
    {
        Kboard.turnleft();
    }
    else if (std::regex_match(instruction,pickbeeper))
    {
        Kboard.pickbeeper();
    }
    else if (std::regex_match(instruction,putbeeper))
    {
        Kboard.putbeeper();
    }
    else if (new_instructions_map.count(no_tab_instruction))
    {
        run_new_instruction(instructions,Kboard, no_tab_instruction);
    }
    
    else
    {
        throw std::runtime_error("Reading instructions error in line: "+ std::to_string(line+1));
    }
}


bool conditional(std::string condition, int line, Board Kboard)
{
    /* Checa si una determinada condición se cumple*/
    if(!conditions.count(condition)) throw std::runtime_error("Reading instructions error in line: "+std::to_string(line+1)+ "\nThere is no condition: '"+condition+"'");
    switch (conditions.at(condition))
    {
    case 1:
        return !Kboard.front_is_bocked();
        break;
    case 2:
        return Kboard.front_is_bocked();
        break;
    case 3:
        return !Kboard.left_is_bocked();
        break;
    case 4:
        return Kboard.left_is_bocked();
        break;
    case 5:
        return !Kboard.right_is_bocked();
        break;
    case 6:
        return Kboard.right_is_bocked();
        break;
    case 7:
        return Kboard.next_to_a_beeper();
        break;
    case 8:
        return !Kboard.next_to_a_beeper();
        break;
    case 9:
        return Kboard.facing_north();
        break;
    case 10:
        return !Kboard.facing_north();
        break;
    case 11:
        return Kboard.facing_south();
        break;
    case 12:
        return !Kboard.facing_south();
        break;
    case 13:
        return Kboard.facing_east();
        break;
    case 14:
        return !Kboard.facing_east();
        break;
    case 15:
        return Kboard.facing_west();
        break;
    case 16:
        return !Kboard.facing_west();
        break;
    case 17:
        return Kboard.beeper_in_bag();
        break;
    default:
        return false;
        break;
    }
}


void Ifthen(std::vector<std::string> &instructions, int &line, int &tabs, Board &Kboard)
{
    // Función utilizada para ejecutar las lineas dentro del IF-THEN si la condición se llega a cumplir
    std::string code = instructions[line];
     
    std::string condition_line = code.substr(3+tabs, code.size()-8-tabs);  // Se crea un substring el cual posee la condición del IF-THEN
    int initial_tabs = tabs;
    ++line;

    bool  condition = conditional(condition_line, line, Kboard); 
    //Se revisa si se cumple la condición que paso all IF-THEN y empieza la ejecución de las lineas
    if(condition)
    {
        if(std::regex_match(instructions[line], begin))
        {
            //Revisa si la primera linea del if es un begin, si no vota error
            tabs_error(instructions[line], tabs, line);
            ++tabs;
        }
        else throw std::runtime_error("Error, the definition of the 'IF-THEN' does not start with a BEGIN");
        for(++line; line<instructions.size();++line)
        {
            // Ejecuta la lineas dentro el IF según la linea actual
            read_line(instructions,line,tabs,Kboard);
            if (check_tabs(instructions[line+1], initial_tabs, line+1) && std::regex_match(instructions[line+1],end))
            {
                // Revisa si la linea actual es un END el cual cumple las condiciones para acabar el if (mismas tabulaciones)
                --tabs;
                ++line;
                semicolon_error(instructions, line);
                ELSE(instructions, line, tabs, Kboard, condition);
                return;
            }
        }
        throw std::runtime_error("Error, the 'IF-THEN' does not end");
    }
    else
    {
        //si no se cumple la condición sigue derecho hasta encontrar el END del if
        if(!std::regex_match(instructions[line],begin)) throw std::runtime_error("Error, the definition of the 'IF-THEN' does not start with a BEGIN");
            
        for(++line; line<instructions.size(); ++line)
            if (check_tabs(instructions[line+1], initial_tabs, line+1) && std::regex_match(instructions[line+1],end))
            {
                ++line;
                semicolon_error(instructions, line);
                ELSE(instructions,line, tabs, Kboard, condition);
                return;
            }
        }
        throw std::runtime_error("Error, the 'IF-THEN' does not end");
}


void ELSE(std::vector<std::string> &instructions, int &line, int &tabs, Board &Kboard, bool condition)
{
    // revisa si la si la siguiente linea es un ELSE y ejecuta las lineas dentro como el if pero cambiando la condición
    if (check_type(instructions[line+1]) == 3)
    {
        ++line;
        check_tabs(instructions[line],tabs,line);
        int initial_tabs = tabs;
        ++line;
    if(!condition)
    {
        if(std::regex_match(instructions[line],begin))
        {
            tabs_error(instructions[line], tabs,line);
            ++tabs;
        }
        else throw std::runtime_error("Error, the definition of the 'ELSE' does not start with a BEGIN");
        for(++line; line<instructions.size();++line)
        {
            read_line(instructions,line,tabs,Kboard);
            if (check_tabs(instructions[line+1], initial_tabs, line+1) && std::regex_match(instructions[line+1],end))
            {
                --tabs;
                ++line;
                semicolon_error(instructions, line);

                return;
            }
        }

        throw std::runtime_error("Error, the 'ELSE' does not end");
    }
    else
    {
        if(!std::regex_match(instructions[line],begin)) throw std::runtime_error("Error, the definition of the 'ELSE' does not start with a BEGIN");
        for(++line; line<instructions.size(); ++line)
            if (check_tabs(instructions[line+1], initial_tabs, line+1) && std::regex_match(instructions[line+1],end))
            {
                ++line;
                semicolon_error(instructions, line);
                return;
            }
        }
        throw std::runtime_error("Error, the 'ELSE' does not end");
    }
    
}


void whileDo(std::vector<std::string> &instructions, int &line, int &tabs, Board &Kboard)
{
    // Función para ejecutar el WHILE-DO la cual es muy similar al IF-THEN pero con unos pequeños cambios
    std::string code = instructions[line];
    
    std::string condition_line = code.substr(6+tabs, code.size()-9-tabs);
    int initial_tabs = tabs;
    ++line;
    if(conditional(condition_line, line, Kboard))
    {
        
        if(std::regex_match(instructions[line],begin))
        {
            tabs_error(instructions[line], tabs,line);
            ++tabs;
        }
        else throw std::runtime_error("Error, the definition of the 'WHILE-DO' does not start with a BEGIN");
        int initial_line = line; //initial line, la linea del begin
        for(line++; line<instructions.size();++line)
        {
            read_line(instructions,line,tabs,Kboard);
            if (check_tabs(instructions[line + 1], initial_tabs, line+1) && std::regex_match(instructions[line + 1],end))
            {
                    // El unico cambio con respecto al if es que si se llega a cerrar el WHILE-DO pregunta otra vez por la condición
                if (conditional(condition_line, line, Kboard))
                {
                    //si se cumple el for vuelve a la primera instrucción del WHILE-DO
                    line = initial_line;
                }
                else
                {  
                    // Si no se cumple simplemente salimos del while
                --tabs;
                ++line;
                semicolon_error(instructions, line);
                return;
                }
            }
        }
        
        throw std::runtime_error("Error, the 'WHILE-DO' does not end");
    
    }
    else
    {
        // Si la condición no se cumple la primera vez que se pregunta simplemente busca el END y acaba
        if(!std::regex_match(instructions[line],begin)) throw std::runtime_error("Error, the definition of the 'WHILE-DO' does not start with a BEGIN");
            
        for(++line; line<instructions.size(); ++line)
            if (check_tabs(instructions[line+1], initial_tabs, line+1) && std::regex_match(instructions[line+1],end))
            {
                ++line;
                semicolon_error(instructions, line);
                return;
            }
        }
        throw std::runtime_error("Error, the 'WHILE-DO' does not end");
}


void iterateTimes(std::vector<std::string> &instructions, int &line, int &tabs, Board &kBoard){
    std::string code = instructions[line];
    /* ejecuta n veces lo siguiente que se encuentre entre un BEGIN y un END */ 
    int n_iterations = std::stoi(code.substr(8+tabs, code.size()-(14+tabs)));
    int initial_line = ++line;
    int initial_tabs = tabs;
    for (int i = 0; i < n_iterations; i++)
    {
        line = initial_line;
        if(std::regex_match(instructions[line],begin))
        {
            tabs_error(instructions[line], tabs,line);
            ++tabs;
        }
        else throw std::runtime_error("Error, the definition of the 'ITERATE' does not start with a BEGIN");

        for(line++; !(check_tabs(instructions[line], initial_tabs, line) && std::regex_match(instructions[line], end)); line++){
            read_line(instructions, line, tabs, kBoard);
        }
        --tabs;
    }
    semicolon_error(instructions, line);
    ++line;
}


void define_new_instruction(std::vector<std::string> &instructions, int &line)
{
    /* Esta función ingresa al mapa new_instructions_map el nombre de la nueva instrucción
    y un vector de enteros de la primera linea del codigo y la ultima linea del codigo */
    std::string code = instructions[line];
    std::string new_instruction=code.substr(24,code.size()-27); //la nueva instrucción
    if(new_instructions_map.count(new_instruction)) throw std::runtime_error("You alredy have a " + new_instruction + " instruction."); //revisa si la instrucción ya esta definida
    ++line;
    if(std::regex_match(instructions[line],begin))
        {
            tabs_error(instructions[line], 1,line);
        }
    ++line;
    int initial_line=line;
    for(line; !(check_tabs(instructions[line+1], 1, line) && std::regex_match(instructions[line+1], end)); line++)
    {
        continue;
    }
    int end_line = ++line;
    tabs_error(instructions[line], 1,line);
    std::vector<int> interval= {initial_line, end_line};
    new_instructions_map[new_instruction] = interval;
}


void run_new_instruction(std::vector<std::string> &instructions,Board &kboard , std::string new_instruction)
{
    //ejecuta las lineas que se encuentran entre el primer elemento del vector del mapa hasta la linea del ultimo elemento del vector
    int tabs = 2;
    for(int line = new_instructions_map[new_instruction][0]; line <new_instructions_map[new_instruction][1];++line)
    {
        if(instructions[line].substr(tabs,new_instruction.size())==new_instruction) throw std::runtime_error("You can't use the statement you are defining in definition");
        read_line(instructions, line, tabs, kboard);
    }
}
