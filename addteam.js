#! /usr/bin/env node

var http = require( 'http' ),
    https = require( 'https' ),
    chalk = require( 'chalk' ),
    fs = require( 'fs' ),
    cheerio = require( 'cheerio' ),
    fileType = require( 'file-type' ),
    readline = require( 'readline-sync' ),
    exec = require( 'child_process' ),
    request = require( 'request' ),
    gosugamers = require( './gosugamers' ),
    hltv = require( './hltv' ),
    logoFilename = '',
    addTeam = {
        teamData : {},
        ensureExists: function( path, mask, callback ) {
            if( typeof mask == 'function' ) { // allow the `mask` parameter to be optional
                callback = mask;
                mask = 0777;
            }

            fs.mkdir( path, mask, function( error ) {
                if( error ) {
                    if( error.code == 'EEXIST' ) {
                        callback( null ); // ignore the error if the folder already exists
                    } else {
                        callback( error ); // something else went wrong
                    }
                } else {
                    callback( null ); // successfully created folder
                }
            });
        },
        setInitialHltv : function( searchPhrase ){
            hltv.search( searchPhrase, function( teams ){
                if( teams.length > 0 ){
                    addTeam.teamData.hltv = {
                        name : teams[ 0 ].name,
                        id : teams[ 0 ].id
                    };
                }
            } );
        },
        searchHltv : function( searchPhrase ){
            'use strict';
            hltv.search( searchPhrase, function( teams ){
                var i,
                    answer;

                if( teams.length <= 0 ){
                    console.log( 'Could not find any teams matching "' + searchPhrase + '". ' );
                    answer = readline.question( 'Please enter another search term or enter to cancel ' );
                    if( answer.length <= 0 ){
                        addTeam.finish();
                    } else {
                        addTeam.searchHltv( answer );
                    }
                } else {
                    for( i = 0; i < teams.length; i = i + 1 ){
                        console.log( parseInt( i + 1, 10 ) + ': ' + teams[ i ].name + ' (' + teams[ i ].country + ')' );
                    }

                    answer = readline.question( 'Select the correct team, if none match, enter 0. To cancel, press Enter ' );
                    if( answer.length <= 0 ){
                        addTeam.finish();
                    } else if( answer === '0' ){
                        answer = readline.question( 'Please enter a search term ' );
                        addTeam.searchHltv( answer );
                    } else {
                        addTeam.teamData.hltv = {
                            name : teams[ answer ].name,
                            id : teams[ answer ].id
                        };

                        addTeam.finish();
                    }
                }
            } );
        },
        setInitialGosugamers : function( searchPhrase ){
            gosugamers.search( searchPhrase, function( teams ){
                if( teams.length > 0 ){
                    addTeam.teamData.gosugamers = teams[ 0 ];
                }
            } );
        },
        searchGosugamers : function( searchPhrase ){
            'use strict';
            gosugamers.search( searchPhrase, function( teams ){
                var i,
                    answer;

                if( teams.length <= 0 ){
                    console.log( 'Could not find any teams matching "' + searchPhrase + '". ' );
                    answer = readline.question( 'Please enter another search term or enter to cancel ' );
                    if( answer.length <= 0 ){
                        addTeam.finish();
                    } else {
                        addTeam.searchGosugamers( answer );
                    }
                } else {
                    for( i = 0; i < teams.length; i = i + 1 ){
                        console.log( parseInt( i + 1, 10 ) + ': ' + teams[ i ].name );
                    }

                    answer = readline.question( 'Select the correct team, if none match, enter 0. To cancel, press Enter ' );
                    if( answer.length <= 0 ){
                        addTeam.finish();
                    } else if( answer === '0' ){
                        answer = readline.question( 'Please enter a search term ' );
                        addTeam.searchGosugamers( answer );
                    } else {
                        addTeam.teamData.gosugamers = teams[ answer ];
                        addTeam.finish();
                    }
                }
            } );
        },
        changeData : function(){
            var answer;
            console.log( '1: Name' );
            console.log( '2: CSGOLounge' );
            console.log( '3: Gosugamers' );
            console.log( '4: HLTV' );

            answer = readline.question( 'What do you want to change? ' );
            switch( answer ){
                case '1':
                    addTeam.setTeamName();
                    break;
                case '2':
                    addTeam.csGoLoungeName();
                    break;
                case '3':
                    addTeam.searchGosugamers( addTeam.teamData.name );
                    break;
                case '4':
                    addTeam.searchHltv( addTeam.teamData.name );
                    break;
                default:
                    addTeam.finish();
                    break;
            }
        },
        writeData : function(){
            fs.writeFile( 'teams/' + addTeam.teamData.name + '/data.json', JSON.stringify( addTeam.teamData, null, 4 ), function( error ){
                if( error ){
                    console.log( error );
                } else {
                    console.log( 'Team data written successfully' );
                    answer = readline.question( 'Open logo for editing (Y/N)? ' );
                    switch( answer ){
                        case 'y':
                        case 'Y':
                            addTeam.watchLogo();
                            exec.execSync( 'open "' + addTeam.logoFilename + '"' );
                            break;
                        default:
                            addTeam.runGrunt();
                            break;
                    }
                }
            });
        },
        finish: function(){
            var answer;
            console.log( JSON.stringify( addTeam.teamData, null, 4 ) );
            answer = readline.question( 'Is this correct? (Y/N) ' );
            switch( answer ){
                case 'n':
                case 'N':
                    addTeam.changeData();
                    break;
                case 'y':
                case 'Y':
                    addTeam.writeData();
                    break;
            }
        },
        runGrunt: function(){
            var child = exec.spawn( 'grunt', [], { stdio: 'inherit' } );

            child.on( 'exit', function(){
                process.exit();
            });
        },
        csGoLoungeName: function(){
            var answer;

            answer = readline.question( 'What is the name of the team on CSGOLounge? ' );
            if( answer.length > 0 ){
                addTeam.teamData.csgolounge = {
                    'name': answer
                };
            }

            addTeam.finish();
        },
        setSteamName: function(){
            var answer;

            answer = readline.question( 'What should be the steam identifier? ' );
            if( answer.length > 0 && answer.length <= 5 ){
                addTeam.teamData.steam = {
                    'name': answer
                };
                addTeam.addLogo();
            } else {
                console.log( 'The length needs to be more than 0 and less than 5' );
                addTeam.setSteamName();
            }
        },
        addLogo : function(){
            var writeTarget = 'teams/' + addTeam.teamData.name + '/logo',
                writeStream = fs.createWriteStream( writeTarget ),
                request,
                extension,
                protocol,
                url;

            url = readline.question( 'URL to the logo? ' );
            if( url.length <= 0 ){
                addTeam.csGoLoungeName();
            } else {
                if( url.substr( 0, 5 ) === 'https' ){
                    protocol = https;
                } else {
                    protocol = http;
                }

                request = protocol.get( url, function( response ) {

                    response.once( 'data', function( chunk ) {
                        extension = fileType( chunk ).ext;
                        addTeam.logoFilename = writeTarget + '.' + extension;
                    });

                    response.on( 'end', function() {
                        fs.rename( writeTarget, addTeam.logoFilename, function( error ) {
                            if( error ) {
                                console.log( 'ERROR: ' + error );
                            }
                        });
                    });

                    response.pipe( writeStream );
                });

                addTeam.csGoLoungeName();
            }
        },
        watchLogo : function(){
            'use strict';
            var sizeOf = require( 'image-size' ),
                dimensions,
                newFilename,
                dimensionString = '';

            console.log( 'watching ' + addTeam.logoFilename );

            fs.watch( addTeam.logoFilename, function( event, filename ) {
                console.log( 'Logo changed, setting new logo name.' );

                dimensions = sizeOf( addTeam.logoFilename );

                if( dimensions.width >= 500 && dimensions.height >= 500 ) {
                    dimensionString = 'highres';
                } else {
                    dimensionString = dimensions.width + 'x' + dimensions.height;
                }

                newFilename = addTeam.logoFilename.replace( 'logo.', 'logo-' + dimensionString + '.' );

                fs.rename( addTeam.logoFilename, newFilename , function( error ) {
                    if( error ) {
                        console.log( 'ERROR: ' + error );
                    }

                    addTeam.runGrunt();
                });
            });
        },
        createTeam : function( teamName ){
            'use strict';

            addTeam.teamData.name = teamName;
            addTeam.setInitialGosugamers( addTeam.teamData.name );
            addTeam.setInitialHltv( addTeam.teamData.name );
            addTeam.ensureExists( 'teams/' + addTeam.teamData.name, function( error ) {
                if( error ){
                    console.log( error );
                } else {
                    addTeam.setSteamName();
                }
            });
        },
        setTeamName : function(){
            var answer;

            answer = readline.question( 'What is the name of the team? ');
            addTeam.createTeam( answer );
        },
        start : function(){
            'use strict';

            addTeam.setTeamName();
        }
    };

addTeam.start();
