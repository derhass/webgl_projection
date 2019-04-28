<?xml version="1.0"?>

<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="text"
    indent="no"
    omit-xml-declaration="no"/>

  <xsl:template match="h1">
    <xsl:text>\part*{</xsl:text>
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="current()"/>
    </xsl:call-template>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="h2">
    <xsl:text>\section*{</xsl:text>
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="current()"/>
    </xsl:call-template>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="h3">
    <xsl:text>\subsection*{</xsl:text>
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="current()"/>
    </xsl:call-template>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="h4">
    <xsl:text>\subsubsection*{</xsl:text>
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="current()"/>
    </xsl:call-template>
    <xsl:text>}</xsl:text>
  </xsl:template>

  <xsl:template match="a[@id='up_button'] | img" />

  <xsl:template match="div">
    <xsl:apply-templates />
  </xsl:template>

  <xsl:template match="ul">
    <xsl:text>\begin{itemize}</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>\end{itemize}</xsl:text>
  </xsl:template>

  <xsl:template match="ol">
    <xsl:text>\begin{enumerate}</xsl:text>
    <xsl:apply-templates select="./*"/>
    <xsl:text>\end{enumerate}</xsl:text>
  </xsl:template>

  <xsl:template match="li">
    <xsl:text>\item </xsl:text>
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="text()" />
    </xsl:call-template>
    <xsl:apply-templates select="./*"/>
  </xsl:template>

  <xsl:template match="table">
    <xsl:text>\begin{center}\begin{tabular}{*{</xsl:text>
    <xsl:value-of select="count(tr/th)-1"/>
    <xsl:text>}{l}{p{11cm}}}</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>\end{tabular}\end{center}</xsl:text>
  </xsl:template>

  <xsl:template match="td/ul | td/ol">
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="text()" />
    </xsl:call-template>
    <xsl:apply-templates select="./*" />
  </xsl:template>

  <xsl:template match="table//li">
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="text()"/>
    </xsl:call-template>
    <xsl:text>\newline </xsl:text>
  </xsl:template>

  <xsl:template match="tr">
    <xsl:apply-templates/>
    <xsl:text>\\\relax </xsl:text>
  </xsl:template>

  <xsl:template match="td | th">
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="text()"/>
    </xsl:call-template>
    <xsl:apply-templates select="./*" />
    <xsl:if test="following-sibling::*">
      <xsl:text>&amp;</xsl:text>
    </xsl:if>
  </xsl:template>

  <!-- <xsl:template match="p">
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="current()"/>
    </xsl:call-template>
    <xsl:text>\\</xsl:text>
  </xsl:template> -->

  <xsl:template match="a | p">
    <xsl:call-template name="replace-all">
      <xsl:with-param name="text" select="current()"/>
    </xsl:call-template>
  </xsl:template>

  <xsl:template name="replace-all">
    <xsl:param name="text"/>

    <xsl:variable name="buffer01">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$text"/>
        <xsl:with-param name="pattern" select="'{'"/>
        <xsl:with-param name="replacement" select="'\{'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer02">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer01"/>
        <xsl:with-param name="pattern" select="'}'"/>
        <xsl:with-param name="replacement" select="'\}'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer0">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer02"/>
        <xsl:with-param name="pattern" select="'#'"/>
        <xsl:with-param name="replacement" select="'\#'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer1">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer0"/>
        <xsl:with-param name="pattern" select="'&quot;'"/>
        <xsl:with-param name="replacement" select="'{\grqq}'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer2">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer1"/>
        <xsl:with-param name="pattern" select="'$'"/>
        <xsl:with-param name="replacement" select="'\$'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer3">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer2"/>
        <xsl:with-param name="pattern" select="'ü'"/>
        <xsl:with-param name="replacement" select="'\&quot;u'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer4">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer3"/>
        <xsl:with-param name="pattern" select="'Ü'"/>
        <xsl:with-param name="replacement" select="'\&quot;U'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer5">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer4"/>
        <xsl:with-param name="pattern" select="'ö'"/>
        <xsl:with-param name="replacement" select="'\&quot;o'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer6">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer5"/>
        <xsl:with-param name="pattern" select="'Ö'"/>
        <xsl:with-param name="replacement" select="'\&quot;o'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer7">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer6"/>
        <xsl:with-param name="pattern" select="'ä'"/>
        <xsl:with-param name="replacement" select="'\&quot;a'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer8">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer7"/>
        <xsl:with-param name="pattern" select="'Ä'"/>
        <xsl:with-param name="replacement" select="'\&quot;A'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer9">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer8"/>
        <xsl:with-param name="pattern" select="'ß'"/>
        <xsl:with-param name="replacement" select="'{\ss}'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="buffer10">
      <xsl:call-template name="replace">
        <xsl:with-param name="value" select="$buffer9"/>
        <xsl:with-param name="pattern" select="'_'"/>
        <xsl:with-param name="replacement" select="'\_'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:value-of select="$buffer10"/>
  </xsl:template>

  <xsl:template name="replace">
    <xsl:param name="value"/>
    <xsl:param name="pattern"/>
    <xsl:param name="replacement"/>
    <xsl:choose>
      <xsl:when test="contains($value, $pattern)">
        <xsl:value-of select="substring-before($value, $pattern)"/>
        <xsl:value-of select="$replacement"/>
        <xsl:call-template name="replace">
          <xsl:with-param name="value" select="substring-after($value, $pattern)"/>
          <xsl:with-param name="pattern" select="$pattern"/>
          <xsl:with-param name="replacement" select="$replacement"/>
        </xsl:call-template>
      </xsl:when>

      <xsl:otherwise>
        <xsl:value-of select="$value"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>
