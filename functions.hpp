#ifndef FUNCTIONS_HPP
#define FUNCTIONS_HPP

#include <iostream>
#include <vector>
#include <fstream>
#include <string>
#include <regex>
#include "Board.hpp"


/* Mapa que nos permite relacionar condiciones con un entero para trabajar más facilmente*/ 
const std::map<std::string,int> conditions = 
{
    {"front-is-clear", 1},
    {"front-is-blocked", 2},
    {"left-is-clear", 3},
    {"left-is-blocked", 4},
    {"right-is-clear", 5},
    {"right-is-blocked", 6},
    {"next-to-a-beeper", 7},
    {"not-next-to-a-beeper", 8},
    {"facing-north", 9},
    {"not-facing-north", 10},
    {"facing-south", 11},
    {"not-facing-south", 12},
    {"facing-east", 13},
    {"not-facing-east", 14},
    {"facing-west", 15},
    {"not-facing-west", 16},
    {"beeper-in-bag", 17}
};


//regex para las distintas formas en las que pudiese haber un error en la escritura del codigo
const std::regex BOP("^BEGINNING-OF-PROGRAM(\\s)?$");
const std::regex EOP("^END-OF-PROGRAM\\s?$");
const std::regex BOE("^\tBEGINNING-OF-EXECUTION(\\s)?$");
const std::regex EOE("^\tEND-OF-EXECUTION(\\s)?$");
const std::regex move("\t+move;?\\s?$");
const std::regex turnleft("\t+turnleft;?\\s?$");
const std::regex pickbeeper("\t+pickbeeper;?\\s?$");
const std::regex putbeeper("\t+putbeeper;?\\s?$");
const std::regex turnoff("^\t{2}turnoff\\s?$");
const std::regex ifthen("^\t+IF .+ THEN(\\s+)?$");
const std::regex Else("^\t+ELSE\\s?$");
const std::regex whiledo("^\t+WHILE .+ DO\\s?$");
const std::regex newinstruction("^\tDEFINE-NEW-INSTRUCTION .+ AS\\s?$");
const std::regex begin("^\t+BEGIN\\s?$");
const std::regex end("^\t+END;?\\s?$");
const std::regex iterate("^\t+ITERATE \\d+ TIMES\\s?$");


//las funciones utilizadas
std::vector<std::string> txt_reader(std::string archive_name);

Board create_map(std::string archive_name);

void print_logo(std::string archive_name);

bool parsingBegin_End(std::vector<std::string> &instructions);

void read_instructions (std::string archive_name, Board &Kboard);

void read_line(std::vector<std::string> &instructions, int &line, int &tabs, Board &kBoard);

bool check_tabs(std::string, int tabs, int line);

void tabs_error(std::string, int tabs, int line);

bool check_semicolon(std::vector<std::string> &instructions, int &line);

void semicolon_error(std::vector<std::string> &instructions, int &line);

unsigned int check_type(std::string instruction);

void basic_instructions(std::vector<std::string> &instructions, std::string, Board &Kboard, int line, int tabs);

bool conditional(std::string condition, int line, Board Kboard);

void Ifthen(std::vector<std::string> &instructions, int &line, int &tabs, Board &kBoard);

void ELSE(std::vector<std::string> &instructions, int &line, int &tabs, Board &kBoard, bool condition);

void whileDo(std::vector<std::string> &instructions, int &line, int &tabs, Board &kBoard);

void iterateTimes(std::vector<std::string> &instructions, int &line, int &tabs, Board &kBoard);

void define_new_instruction(std::vector<std::string> &instructions, int &line);

void run_new_instruction(std::vector<std::string> &instructions,Board &kboard, std::string instruction);

#endif