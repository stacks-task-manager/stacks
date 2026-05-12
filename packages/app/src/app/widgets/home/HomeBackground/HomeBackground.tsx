// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import tinycolor from "tinycolor2";

import { adjustColor, encodeSvg } from "app/utils/colors";
import { HOMEBACKGROUNDPATTERN } from "@stacks/types";
import { usePreferences } from "app/hooks";

interface IHomeBackgroundProps {
    pattern?: HOMEBACKGROUNDPATTERN;
    color: string;
}
export const HomeBackground: FunctionComponent<IHomeBackgroundProps> = ({ pattern, color }) => {
    const { darkMode } = usePreferences(["darkMode"]);

    const backgroundColor = useMemo(() => {
        return darkMode ? tinycolor(color).desaturate().darken(50).toHex() : color;
    }, [color, darkMode]);

    if (!pattern) return null;
    return (
        <div className="home-background">
            {pattern === HOMEBACKGROUNDPATTERN.WAVES ? <HomeBackgroundWaves color={backgroundColor} /> : null}
            {pattern === HOMEBACKGROUNDPATTERN.TORNADO ? (
                <HomeBackgroundTornado color={backgroundColor} />
            ) : null}
            {pattern === HOMEBACKGROUNDPATTERN.ROSE ? <HomeBackgroundRose color={backgroundColor} /> : null}
            {pattern === HOMEBACKGROUNDPATTERN.CONSTELLATION ? (
                <HomeBackgroundConstellation color={backgroundColor} />
            ) : null}
            {pattern === HOMEBACKGROUNDPATTERN.LINES ? <HomeBackgroundLines color={backgroundColor} /> : null}
            {pattern === HOMEBACKGROUNDPATTERN.SPRINKLE ? (
                <HomeBackgroundSprinkle color={backgroundColor} />
            ) : null}
            {pattern === HOMEBACKGROUNDPATTERN.SHINY ? <HomeBackgroundShiny color={backgroundColor} /> : null}
        </div>
    );
};

interface IBackgroundProps {
    color: string;
}

const HomeBackgroundWaves: FunctionComponent<IBackgroundProps> = ({ color }) => {
    const waves: string[] = useMemo(() => {
        return [
            color,
            adjustColor(color, -20),
            adjustColor(color, -10),
            adjustColor(color, 0),
            adjustColor(color, 10),
            adjustColor(color, 20),
            adjustColor(color, 30),
            adjustColor(color, 40),
            adjustColor(color, 50),
            adjustColor(color, 60),
            adjustColor(color, 70),
        ];
    }, [color]);

    const backgroundUrl = useMemo(() => {
        return encodeSvg(
            `
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1600 800">
                <rect fill="${waves[0]}" width="1600" height="800" />
                <g fill-opacity="1">
                    <path fill="${waves[1]}"
                        d="M486 705.8c-109.3-21.8-223.4-32.2-335.3-19.4C99.5 692.1 49 703 0 719.8V800h843.8c-115.9-33.2-230.8-68.1-347.6-92.2C492.8 707.1 489.4 706.5 486 705.8z" />
                    <path fill="${waves[2]}"
                        d="M1600 0H0v719.8c49-16.8 99.5-27.8 150.7-33.5c111.9-12.7 226-2.4 335.3 19.4c3.4 0.7 6.8 1.4 10.2 2c116.8 24 231.7 59 347.6 92.2H1600V0z" />
                    <path fill="${waves[3]}"
                        d="M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z" />
                    <path fill="${waves[4]}"
                        d="M0 0v429.4c55.6-18.4 113.5-27.3 171.4-27.7c102.8-0.8 203.2 22.7 299.3 54.5c3 1 5.9 2 8.9 3c183.6 62 365.7 146.1 562.4 192.1c186.7 43.7 376.3 34.4 557.9-12.6V0H0z" />
                    <path fill="${waves[5]}"
                        d="M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z" />
                    <path fill="${waves[6]}"
                        d="M1600 0H0v136.3c62.3-20.9 127.7-27.5 192.2-19.2c93.6 12.1 180.5 47.7 263.3 89.6c2.6 1.3 5.1 2.6 7.7 3.9c158.4 81.1 319.7 170.9 500.3 223.2c210.5 61 430.8 49 636.6-16.6V0z" />
                    <path fill="${waves[7]}"
                        d="M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z" />
                    <path fill="${waves[8]}"
                        d="M1600 0H498c118.1 85.8 243.5 164.5 386.8 216.2c191.8 69.2 400 74.7 595 21.1c40.8-11.2 81.1-25.2 120.3-41.7V0z" />
                    <path fill="${waves[9]}"
                        d="M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z" />
                    <path fill="${waves[10]}"
                        d="M1315.3 72.4c75.3-12.6 148.9-37.1 216.8-72.4h-723C966.8 71 1144.7 101 1315.3 72.4z" />
                </g>
            </svg>
            `
        );
    }, [waves]);

    return (
        <div
            className="background"
            style={{
                backgroundImage: `url("data:image/svg+xml,${backgroundUrl}")`,
            }}
        />
    );
};

const HomeBackgroundTornado: FunctionComponent<IBackgroundProps> = ({ color }) => {
    const colors: string[] = useMemo(() => {
        return [adjustColor(color, 10), adjustColor(color, 50), adjustColor(color, -10)];
    }, [color]);

    const backgroundUrl = useMemo(() => {
        return encodeSvg(
            `
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1500'>
                <rect fill='#ee5522' width='2000' height='1500' />
                <defs>
                    <radialGradient id='a' gradientUnits='objectBoundingBox'>
                        <stop offset='0' stop-color='${colors[1]}' />
                        <stop offset='1' stop-color='${colors[0]}' />
                    </radialGradient>
                    <linearGradient id='b' gradientUnits='userSpaceOnUse' x1='0' y1='750' x2='1550' y2='750'>
                        <stop offset='0' stop-color='${colors[2]}' />
                        <stop offset='1' stop-color='${colors[0]}' />
                    </linearGradient>
                    <path id='s' fill='url(#b)'
                        d='M1549.2 51.6c-5.4 99.1-20.2 197.6-44.2 293.6c-24.1 96-57.4 189.4-99.3 278.6c-41.9 89.2-92.4 174.1-150.3 253.3c-58 79.2-123.4 152.6-195.1 219c-71.7 66.4-149.6 125.8-232.2 177.2c-82.7 51.4-170.1 94.7-260.7 129.1c-90.6 34.4-184.4 60-279.5 76.3C192.6 1495 96.1 1502 0 1500c96.1-2.1 191.8-13.3 285.4-33.6c93.6-20.2 185-49.5 272.5-87.2c87.6-37.7 171.3-83.8 249.6-137.3c78.4-53.5 151.5-114.5 217.9-181.7c66.5-67.2 126.4-140.7 178.6-218.9c52.3-78.3 96.9-161.4 133-247.9c36.1-86.5 63.8-176.2 82.6-267.6c18.8-91.4 28.6-184.4 29.6-277.4c0.3-27.6 23.2-48.7 50.8-48.4s49.5 21.8 49.2 49.5c0 0.7 0 1.3-0.1 2L1549.2 51.6z' />
                    <g id='g'>
                        <use href='#s' transform='scale(0.12) rotate(60)' />
                        <use href='#s' transform='scale(0.2) rotate(10)' />
                        <use href='#s' transform='scale(0.25) rotate(40)' />
                        <use href='#s' transform='scale(0.3) rotate(-20)' />
                        <use href='#s' transform='scale(0.4) rotate(-30)' />
                        <use href='#s' transform='scale(0.5) rotate(20)' />
                        <use href='#s' transform='scale(0.6) rotate(60)' />
                        <use href='#s' transform='scale(0.7) rotate(10)' />
                        <use href='#s' transform='scale(0.835) rotate(-40)' />
                        <use href='#s' transform='scale(0.9) rotate(40)' />
                        <use href='#s' transform='scale(1.05) rotate(25)' />
                        <use href='#s' transform='scale(1.2) rotate(8)' />
                        <use href='#s' transform='scale(1.333) rotate(-60)' />
                        <use href='#s' transform='scale(1.45) rotate(-30)' />
                        <use href='#s' transform='scale(1.6) rotate(10)' />
                    </g>
                </defs>
                <g transform='rotate(0 0 0)'>
                    <g transform='rotate(0 0 0)'>
                        <circle fill='url(#a)' r='3000' />
                        <g opacity='0.5'>
                            <circle fill='url(#a)' r='2000' />
                            <circle fill='url(#a)' r='1800' />
                            <circle fill='url(#a)' r='1700' />
                            <circle fill='url(#a)' r='1651' />
                            <circle fill='url(#a)' r='1450' />
                            <circle fill='url(#a)' r='1250' />
                            <circle fill='url(#a)' r='1175' />
                            <circle fill='url(#a)' r='900' />
                            <circle fill='url(#a)' r='750' />
                            <circle fill='url(#a)' r='500' />
                            <circle fill='url(#a)' r='380' />
                            <circle fill='url(#a)' r='250' />
                        </g>
                        <g transform='rotate(0 0 0)'>
                            <use href='#g' transform='rotate(10)' />
                            <use href='#g' transform='rotate(120)' />
                            <use href='#g' transform='rotate(240)' />
                        </g>
                        <circle fill-opacity='0.1' fill='url(#a)' r='3000' />
                    </g>
                </g>
            </svg>
            `
        );
    }, [colors]);

    return (
        <div
            className="background"
            style={{
                backgroundImage: `url("data:image/svg+xml,${backgroundUrl}")`,
            }}
        />
    );
};

const HomeBackgroundConstellation: FunctionComponent<IBackgroundProps> = ({ color }) => {
    const colors: string[] = useMemo(() => {
        return [adjustColor(color, 80), adjustColor(color, 10), adjustColor(color, 0)];
    }, [color]);

    const backgroundUrl = useMemo(() => {
        return encodeSvg(
            `
            <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'>
                <rect fill='${colors[0]}' width='800' height='800' />
                <g fill='none' stroke='${colors[1]}' stroke-width='1'>
                    <path
                        d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63' />
                    <path d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764' />
                    <path
                        d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880' />
                    <path
                        d='M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382' />
                    <path
                        d='M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269' />
                </g>
                <g fill='${colors[2]}'>
                    <circle cx='769' cy='229' r='5' />
                    <circle cx='539' cy='269' r='5' />
                    <circle cx='603' cy='493' r='5' />
                    <circle cx='731' cy='737' r='5' />
                    <circle cx='520' cy='660' r='5' />
                    <circle cx='309' cy='538' r='5' />
                    <circle cx='295' cy='764' r='5' />
                    <circle cx='40' cy='599' r='5' />
                    <circle cx='102' cy='382' r='5' />
                    <circle cx='127' cy='80' r='5' />
                    <circle cx='370' cy='105' r='5' />
                    <circle cx='578' cy='42' r='5' />
                    <circle cx='237' cy='261' r='5' />
                    <circle cx='390' cy='382' r='5' />
                </g>
            </svg>
            `
        );
    }, [colors]);

    return (
        <div
            className="background"
            style={{
                backgroundImage: `url("data:image/svg+xml,${backgroundUrl}")`,
            }}
        />
    );
};

const HomeBackgroundRose: FunctionComponent<IBackgroundProps> = ({ color }) => {
    const colors: string[] = useMemo(() => {
        return [color, adjustColor(color, 80), adjustColor(color, -10)];
    }, [color]);

    const backgroundUrl = useMemo(() => {
        return encodeSvg(
            `
            <svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 800 400'>
                <rect fill='${colors[0]}' width='800' height='400' />
                <defs>
                    <radialGradient id='a' cx='396' cy='281' r='514' gradientUnits='userSpaceOnUse'>
                        <stop offset='0' stop-color='${colors[1]}' />
                        <stop offset='1' stop-color='${colors[0]}' />
                    </radialGradient>
                    <linearGradient id='b' gradientUnits='userSpaceOnUse' x1='400' y1='148' x2='400' y2='333'>
                        <stop offset='0' stop-color='${colors[2]}' stop-opacity='0' />
                        <stop offset='1' stop-color='${colors[2]}' stop-opacity='0.5' />
                    </linearGradient>
                </defs>
                <rect fill='url(#a)' width='800' height='400' />
                <g fill-opacity='0.4'>
                    <circle fill='url(#b)' cx='267.5' cy='61' r='300' />
                    <circle fill='url(#b)' cx='532.5' cy='61' r='300' />
                    <circle fill='url(#b)' cx='400' cy='30' r='300' />
                </g>
            </svg>
            `
        );
    }, [colors]);

    return (
        <div
            className="background"
            style={{
                backgroundImage: `url("data:image/svg+xml,${backgroundUrl}")`,
            }}
        />
    );
};

const HomeBackgroundLines: FunctionComponent<IBackgroundProps> = ({ color }) => {
    const colors: string[] = useMemo(() => {
        return [color, adjustColor(color, 80)];
    }, [color]);

    const backgroundUrl = useMemo(() => {
        return encodeSvg(
            `
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="1440" height="1440" viewBox="0 0 1440 1440">
                <g mask="url(&quot;#SvgjsMask1001&quot;)" fill="none">
                    <rect width="1440" height="1440" x="0" y="0" fill="${colors[0]}"></rect>
                    <path
                        d="M262.41 1533.94C491.82 1299.38 384.3 404.31 716.32 302.53 1048.34 200.75 943.27 482.53 1170.23 482.53 1397.19 482.53 1502.11 305.78 1624.14 302.53"
                        stroke="${colors[1]}" stroke-width="2"></path>
                    <path
                        d="M433.61 1597.48C602.5 1488.71 389.25 1028.02 811.76 888.49 1234.27 748.96 1320.71 270.64 1568.07 226.09"
                        stroke="${colors[1]}" stroke-width="2"></path>
                    <path
                        d="M224.03 1481.87C546.43 1268.04 513.7 150.7 939.95 109.97 1366.21 69.24 1447.48 525.67 1655.88 541.97"
                        stroke="${colors[1]}" stroke-width="2"></path>
                    <path
                        d="M179.54 1526.64C432.11 1457.28 411.86 853.98 888.12 754.91 1364.37 655.84 1373.03 225.96 1596.69 193.31"
                        stroke="${colors[1]}" stroke-width="2"></path>
                    <path
                        d="M104.67 1607.56C402.94 1459.67 434.07 498.66 823.65 486.65 1213.24 474.64 1322.58 978.97 1542.64 1005.05"
                        stroke="${colors[1]}" stroke-width="2"></path>
                </g>
                <defs>
                    <mask id="SvgjsMask1001">
                        <rect width="1440" height="1440" fill="#ffffff"></rect>
                    </mask>
                </defs>
            </svg>
            `
        );
    }, [colors]);

    return (
        <div
            className="background"
            style={{
                backgroundImage: `url("data:image/svg+xml,${backgroundUrl}")`,
            }}
        />
    );
};

const HomeBackgroundSprinkle: FunctionComponent<IBackgroundProps> = ({ color }) => {
    const colors: string[] = useMemo(() => {
        return [color, adjustColor(color, 80)];
    }, [color]);

    const backgroundUrl = useMemo(() => {
        return encodeSvg(
            `
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" width="1440" height="1440" preserveAspectRatio="none" viewBox="0 0 1440 1440">
                <g mask="url(&quot;#SvgjsMask1008&quot;)" fill="none">
                    <rect width="1440" height="1440" x="0" y="0" fill="${colors[1]}"></rect>
                    <use xlink:href="#SvgjsSymbol1015" x="0" y="0"></use>
                    <use xlink:href="#SvgjsSymbol1015" x="0" y="720"></use>
                    <use xlink:href="#SvgjsSymbol1015" x="720" y="0"></use>
                    <use xlink:href="#SvgjsSymbol1015" x="720" y="720"></use>
                </g>
                <defs>
                    <mask id="SvgjsMask1008">
                        <rect width="1440" height="1440" fill="#ffffff"></rect>
                    </mask>
                    <path d="M-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0z" id="SvgjsPath1013"></path>
                    <path d="M-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0z" id="SvgjsPath1011"></path>
                    <path d="M-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0z" id="SvgjsPath1010"></path>
                    <path d="M2 -2 L-2 2z" id="SvgjsPath1012"></path>
                    <path d="M6 -6 L-6 6z" id="SvgjsPath1009"></path>
                    <path d="M30 -30 L-30 30z" id="SvgjsPath1014"></path>
                </defs>
                <symbol id="SvgjsSymbol1015">
                    <use xlink:href="#SvgjsPath1009" x="30" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="30" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="30" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="30" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="30" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="30" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="30" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="30" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="30" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="30" y="570" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1010" x="30" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="30" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="90" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="90" y="90" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1013" x="90" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="90" y="210" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1012" x="90" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="90" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="90" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="90" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="90" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="90" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="90" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="90" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="150" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="150" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="150" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="150" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="150" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="150" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="150" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="150" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="150" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="150" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="150" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="150" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="210" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="210" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="210" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="210" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="210" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="210" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="210" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="210" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="210" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="210" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="210" y="630" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1011" x="210" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="270" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="270" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="270" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="270" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="270" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="270" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="270" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="270" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="270" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="270" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="270" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="270" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="330" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="330" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="330" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="330" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="330" y="270" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1011" x="330" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="330" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="330" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="330" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="330" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="330" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="330" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="390" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="390" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="390" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="390" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="390" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="390" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="390" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="390" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="390" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="390" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="390" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="390" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="450" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="450" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="450" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="450" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="450" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="450" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="450" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="450" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="450" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="450" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="450" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="450" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="510" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="510" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="510" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="510" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="510" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="510" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="510" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="510" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="510" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="510" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="510" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="510" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="570" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="570" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="570" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="570" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="570" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="570" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="570" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="570" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="570" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="570" y="570" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1011" x="570" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="570" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="630" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="630" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="630" y="150" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1010" x="630" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="630" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1013" x="630" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="630" y="390" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="630" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="630" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="630" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="630" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="630" y="690" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="690" y="30" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="690" y="90" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="690" y="150" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1012" x="690" y="210" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="690" y="270" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="690" y="330" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1014" x="690" y="390" stroke="${colors[0]}" stroke-width="3"></use>
                    <use xlink:href="#SvgjsPath1009" x="690" y="450" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1011" x="690" y="510" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1010" x="690" y="570" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="690" y="630" stroke="${colors[0]}"></use>
                    <use xlink:href="#SvgjsPath1009" x="690" y="690" stroke="${colors[0]}"></use>
                </symbol>
            </svg>
            `
        );
    }, [colors]);

    return (
        <div
            className="background"
            style={{
                backgroundImage: `url("data:image/svg+xml,${backgroundUrl}")`,
            }}
        />
    );
};

const HomeBackgroundShiny: FunctionComponent<IBackgroundProps> = ({ color }) => {
    const colors: string[] = useMemo(() => {
        return [adjustColor(color, 30), color, adjustColor(color, -30)];
    }, [color]);

    const backgroundUrl = useMemo(() => {
        return encodeSvg(
            `
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs" width="1440" height="1440" preserveAspectRatio="none" viewBox="0 0 1440 1440">
                <g mask="url(&quot;#SvgjsMask1004&quot;)" fill="none">
                    <rect width="1440" height="1440" x="0" y="0" fill="${colors[1]}"></rect>
                    <path d="M0,693.144C131.863,707.359,280.176,675.303,373.305,580.874C463.739,489.178,443.754,341.049,471.322,215.246C492.669,117.83,524.609,25.112,516.881,-74.316C508.749,-178.944,484.608,-282.06,425.907,-369.051C362.399,-463.166,274.391,-536.618,171.924,-585.52C56.479,-640.616,-76.033,-711.481,-195.434,-665.586C-315.026,-619.618,-339.969,-463.49,-415.259,-359.824C-482.598,-267.106,-586.325,-199.408,-614.65,-88.373C-644.322,27.943,-626.537,154.206,-573.912,262.097C-521.968,368.591,-419.673,434.447,-324.932,505.604C-222.871,582.259,-126.907,679.463,0,693.144" fill="${colors[2]}"></path>
                    <path d="M1440 1952.6570000000002C1540.812 1939.024 1644.733 1946.31 1733.819 1897.191 1826.473 1846.104 1886.996 1758.301 1948.561 1672.252 2023.623 1567.339 2162.307 1465.907 2132.124 1340.488 2101.14 1211.742 1902.299 1214.626 1814.561 1115.441 1728.306 1017.932 1750.559 836.68 1634.424 777.853 1520.21 719.999 1381.386 788.067 1262.607 835.854 1152.286 880.238 1044.705 941.592 979.788 1041.224 918.575 1135.17 927.082 1253.18 917.875 1364.93 909.237 1469.774 899.447 1572.634 927.656 1673.98 959.611 1788.785 985.565 1927.28 1090.25 1984.221 1195.206 2041.309 1321.601 1968.6680000000001 1440 1952.6570000000002" fill="${colors[0]}"></path>
                </g>
                <defs>
                    <mask id="SvgjsMask1004">
                        <rect width="1440" height="1440" fill="#ffffff"></rect>
                    </mask>
                </defs>
            </svg>
            `
        );
    }, [colors]);

    return (
        <div
            className="background"
            style={{
                backgroundImage: `url("data:image/svg+xml,${backgroundUrl}")`,
            }}
        />
    );
};
