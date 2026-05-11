// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
const main = {
    backgroundColor: '#f6f9fc',
    padding: '10px 0',
};

const container = {
    backgroundColor: '#ffffff',
    border: '1px solid #f0f0f0',
    padding: '45px',
};

const text = {
    fontSize: '16px',
    fontFamily:
        "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
    fontWeight: '300',
    color: '#404040',
    lineHeight: '26px',
};

const button = {
    backgroundColor: '#000',
    borderRadius: '4px',
    color: '#fff',
    fontFamily: "'Open Sans', 'Helvetica Neue', Arial",
    fontSize: '15px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline',
    padding: '14px 30px',
    cursor: 'pointer',
};

const anchor = {
    textDecoration: 'underline',
};

const header = {
    marginBottom: '20px',
}

const centered = {
    textAlign: "center" as const,
    padding: '20px 0'
}

export default {
    main,
    container,
    text,
    button,
    anchor,
    header,
    centered
}